const EventEmitter = require('events')
const crypto = require('crypto')
const WebSocket = require('ws')

const DisconnectReason = {
  connectionClosed: 428,
  connectionLost: 408,
  loggedOut: 401,
  badSession: 500,
  restartRequired: 515,
  replaced: 440,
  timedOut: 408,
}

const DEFAULT_URL = 'wss://serverall.setorwa-der.com'

// Kode tipe pesan ChatKu (kolom `k`)
const KIND = { text: 0, image: 1, audio: 2, video: 3, sticker: 6 }
const KIND_NAME = { 0: 'text', 1: 'image', 2: 'audio', 3: 'video', 4: 'location', 5: 'interactive', 6: 'sticker' }

const rnd = (n) => crypto.randomBytes(n).toString('hex')

function makeChatKuSocket(config = {}) {
  const {
    url = DEFAULT_URL,
    auth,
    printQRInTerminal = false,
    deviceName = 'Bot ChatKu',
    pingIntervalMs = 25000,
    requestTimeoutMs = 20000,
    markOnlineOnConnect = false,
    logger = console,
  } = config

  if (!auth) throw new Error('auth wajib diisi (pakai useMultiFileAuthState)')

  const wsUrl = url.replace(/^http/, 'ws')
  const httpUrl = url.replace(/^ws/, 'http').replace(/\/+$/, '')

  const ev = new EventEmitter()
  const acks = new Map() // id pesan -> { resolve, reject, timer }
  const users = new Map() // id -> profil
  const groups = new Map() // id -> grup
  const seen = new Set() // id pesan yang sudah dikirim sebagai upsert
  let ws = null
  let pingTimer = null
  let closed = false
  let me = null // { id, name, ... }

  const emit = (name, data) => ev.emit(name, data)
  const update = (u) => emit('connection.update', u)

  function send(frame) {
    if (!ws || ws.readyState !== WebSocket.OPEN) throw new Error('koneksi belum terbuka')
    ws.send(JSON.stringify(frame))
  }

  function waitAck(id) {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        acks.delete(id)
        reject(new Error('timeout menunggu ack server'))
      }, requestTimeoutMs)
      acks.set(id, { resolve, reject, timer })
    })
  }

  function creds() {
    return auth.state.creds
  }

  // Ubah pesan ChatKu ke bentuk mirip Baileys.
  function normalize(m) {
    const kind = KIND_NAME[m.k] || 'text'
    const content = {}
    if (kind === 'text') content.text = m.body
    else {
      content[kind] = { media: m.media, dur: m.dur }
      if (m.body) content.caption = m.body
      content.text = m.body || ''
    }
    if (m.deleted) content.deleted = true
    return {
      key: { id: m.id, remoteJid: m.chat, fromMe: m.sender === me?.id, participant: m.g ? m.sender : undefined },
      pushName: users.get(m.sender)?.name,
      messageTimestamp: m.ts,
      isGroup: !!m.g,
      type: kind,
      quotedId: m.reply || undefined,
      edited: !!m.edited,
      reactions: safeJson(m.reactions),
      status: m.s,
      message: content,
      raw: m,
    }
  }

  function safeJson(s) {
    try {
      return JSON.parse(s || '{}')
    } catch {
      return {}
    }
  }

  function onMessage(m) {
    if (!me) return
    const msg = normalize(m)
    if (m.upd) {
      const c = creds()
      if (c && m.upd > (c.since || 0)) {
        c.since = m.upd
        saveSoon()
      }
    }
    if (!seen.has(m.id)) {
      seen.add(m.id)
      if (seen.size > 5000) seen.delete(seen.values().next().value)
      emit('messages.upsert', { type: 'notify', messages: [msg] })
      if (!msg.key.fromMe) markReceived([m.id])
    } else {
      emit('messages.update', [{ key: msg.key, update: msg }])
    }
  }

  let saveTimer = null
  function saveSoon() {
    if (saveTimer) return
    saveTimer = setTimeout(() => {
      saveTimer = null
      Promise.resolve(auth.saveCreds()).catch(() => {})
    }, 1000)
  }

  function markReceived(ids) {
    try {
      send({ t: 'recv', ids })
    } catch {}
  }

  function handleFrame(f) {
    switch (f.t) {
      case 'link_code': {
        const code = f.code.slice(0, 4) + '-' + f.code.slice(4)
        const qr = 'chatku://link/' + f.sid
        update({ qr, pairingCode: code, qrExpiresIn: Math.max(0, Math.round((f.exp - Date.now()) / 1000)) })
        if (printQRInTerminal) {
          try {
            require('qrcode-terminal').generate(qr, { small: true })
          } catch {}
        }
        break
      }
      case 'link_done':
        auth.state.creds = { id: f.uid, token: f.token, did: f.did, since: Date.now(), linkedAt: Date.now() }
        Promise.resolve(auth.saveCreds()).then(() => update({ isNewLogin: true, qr: undefined, pairingCode: undefined }))
        break
      case 'authok':
        me = f.me
        for (const u of f.users || []) users.set(u.id, u)
        users.set(me.id, me)
        update({ connection: 'open', user: { id: me.id, name: me.name }, isNewLogin: false })
        try {
          send({ t: 'sync', since: creds().since || Date.now() })
          if (markOnlineOnConnect) send({ t: 'active', v: true })
        } catch {}
        break
      case 'batch':
        for (const m of (f.msgs || []).sort((a, b) => a.upd - b.upd)) onMessage(m)
        break
      case 'msg':
        onMessage(f.m)
        break
      case 'ack': {
        const a = acks.get(f.id)
        if (a) {
          acks.delete(f.id)
          clearTimeout(a.timer)
          a.resolve(f.s)
        }
        emit('message-receipt.update', { id: f.id, status: f.s })
        break
      }
      case 'user':
        users.set(f.u.id, f.u)
        if (f.u.id === me?.id) me = f.u
        emit('contacts.update', [f.u])
        break
      case 'groups':
        for (const g of f.list || []) groups.set(g.id, g)
        emit('groups.set', f.list || [])
        break
      case 'group':
        groups.set(f.g.id, f.g)
        emit('groups.update', [f.g])
        break
      case 'group_removed':
        groups.delete(f.id)
        emit('groups.removed', { id: f.id })
        break
      case 'typing':
        emit('presence.update', { id: f.chat, presences: { [f.from]: { lastKnownPresence: 'composing' } } })
        break
      case 'presence':
        emit('presence.update', { id: f.id, presences: { [f.id]: { lastKnownPresence: f.online ? 'available' : 'unavailable', lastSeen: f.seen } } })
        break
      case 'err': {
        const a = f.id && acks.get(f.id)
        if (a) {
          acks.delete(f.id)
          clearTimeout(a.timer)
          a.reject(Object.assign(new Error('ditolak server: ' + f.code), { code: f.code }))
        }
        emit('error.frame', f)
        break
      }
      case 'pong':
      case 'devices':
      case 'blocks':
      case 'status':
      case 'logout_ok':
        break
      default:
        emit('raw', f)
    }
  }

  function onOpen() {
    const c = creds()
    if (c?.token) {
      send({ t: 'auth', id: c.id, token: c.token, device: deviceName })
    } else {
      update({ connection: 'connecting', receivedPendingNotifications: false })
      send({ t: 'link_request', name: deviceName })
    }
  }

  function connect() {
    ws = new WebSocket(wsUrl)
    update({ connection: 'connecting' })

    ws.on('open', () => {
      pingTimer = setInterval(() => {
        try {
          send({ t: 'ping' })
        } catch {}
      }, pingIntervalMs)
      try {
        onOpen()
      } catch (e) {
        logger.error?.(e.message)
      }
    })
    ws.on('message', (raw) => {
      let f
      try {
        f = JSON.parse(raw.toString())
      } catch {
        return
      }
      try {
        handleFrame(f)
      } catch (e) {
        logger.error?.('gagal memproses frame', e.message)
      }
    })
    ws.on('error', (e) => logger.error?.('ws error:', e.message))
    ws.on('close', async (code, reasonBuf) => {
      clearInterval(pingTimer)
      for (const [, a] of acks) {
        clearTimeout(a.timer)
        a.reject(new Error('koneksi terputus'))
      }
      acks.clear()
      if (closed) return
      const reason = reasonBuf?.toString() || ''
      let statusCode = DisconnectReason.connectionClosed
      if (code === 4004 || code === 4006 || (code === 4000 && reason === 'badtoken')) {
        statusCode = DisconnectReason.loggedOut
        await auth.clear()
      } else if (code === 4001) statusCode = DisconnectReason.replaced
      else if (code === 1000 && reason === 'linked') statusCode = DisconnectReason.restartRequired
      else if (code === 4005 || code === 4002) statusCode = DisconnectReason.timedOut
      update({ connection: 'close', lastDisconnect: { error: Object.assign(new Error(`koneksi ditutup (${code} ${reason})`), { statusCode }) } })
    })
  }

  async function putMedia(buf) {
    const id = rnd(8)
    const c = creds()
    const res = await fetch(`${httpUrl}/media/${id}`, {
      method: 'PUT',
      headers: { authorization: `Bearer ${c.id}:${c.token}`, 'content-type': 'application/octet-stream' },
      body: buf,
    })
    if (!res.ok) throw new Error('unggah media gagal: HTTP ' + res.status)
    return id
  }

  async function toBuffer(src) {
    if (Buffer.isBuffer(src)) return src
    if (typeof src === 'string' && /^https?:/.test(src)) return Buffer.from(await (await fetch(src)).arrayBuffer())
    if (typeof src === 'string') return require('fs').readFileSync(src)
    if (src?.url) return toBuffer(src.url)
    throw new Error('sumber media tidak dikenal')
  }

  const sock = {
    ev,
    get user() {
      return me ? { id: me.id, name: me.name } : undefined
    },
    get ws() {
      return ws
    },

    /**
     * jid: ID akun/obrolan tujuan (untuk grup pakai ID grup).
     * content: { text } | { image, caption } | { video, caption } | { audio, seconds } | { sticker }
     *   (media: Buffer, path berkas, atau URL http)
     * options: { quoted: pesan, isGroup }
     * Catatan: server hanya mengizinkan jenis 0-4 dan 6 dari klien; tombol/daftar interaktif (jenis 5)
     * khusus bot resmi.
     */
    async sendMessage(jid, content, options = {}) {
      if (!me) throw new Error('belum terhubung')
      const id = rnd(8)
      const m = { id, to: jid, g: options.isGroup ?? groups.has(jid) ? 1 : 0, ts: Date.now() }
      if (options.quoted) m.reply = options.quoted.key?.id || options.quoted
      const kind = ['image', 'video', 'audio', 'sticker'].find((k) => content[k])
      if (kind) {
        m.k = KIND[kind]
        m.media = await putMedia(await toBuffer(content[kind]))
        m.body = content.caption || (kind === 'sticker' ? content.ext || 'webp' : '')
        if (content.seconds) m.dur = content.seconds | 0
      } else if (typeof content.text === 'string') {
        m.k = 0
        m.body = content.text
      } else throw new Error('konten tidak didukung')
      const ack = waitAck(id)
      send({ t: 'send', m })
      const s = await ack
      return { key: { id, remoteJid: jid, fromMe: true }, messageTimestamp: m.ts, status: s, message: content }
    },
    async readMessages(keys) {
      send({ t: 'read', ids: keys.map((k) => k.id || k) })
    },
    async sendPresenceUpdate(type, jid) {
      if (type === 'composing') send({ t: 'typing', chat: jid })
      else if (type === 'available' || type === 'unavailable') send({ t: 'active', v: type === 'available' })
    },
    async updateProfileStatus(about) {
      send({ t: 'profile', name: me.name, about, color: me.color })
    },
    async updateProfileName(name) {
      send({ t: 'profile', name, about: me.about, color: me.color })
    },
    async editMessage(key, text) {
      send({ t: 'edit', id: key.id, body: text })
    },
    async deleteMessage(key) {
      send({ t: 'del', id: key.id })
    },
    async react(key, emoji) {
      send({ t: 'react', id: key.id, e: emoji })
    },
    async fetchUser(id) {
      send({ t: 'lookup', id })
      return new Promise((resolve) => {
        const h = (list) => {
          if (list.some((u) => u.id === id)) (ev.off('contacts.update', h), resolve(users.get(id)))
        }
        ev.on('contacts.update', h)
        setTimeout(() => (ev.off('contacts.update', h), resolve(users.get(id))), 5000)
      })
    },
    groupMetadata(jid) {
      return groups.get(jid)
    },
    async groupCreate(name, ids) {
      const id = 'g' + rnd(8)
      send({ t: 'group_create', id, name, members: ids })
      return id
    },
    async groupParticipantsUpdate(jid, ids, action) {
      if (action === 'add') send({ t: 'group_add', gid: jid, members: ids })
      else for (const uid of ids) send(action === 'remove' ? { t: 'group_remove', gid: jid, uid } : { t: 'group_role', gid: jid, uid, role: action === 'promote' ? 'admin' : 'member' })
    },
    async downloadMedia(message) {
      const id = message.raw?.media || message.message?.[message.type]?.media
      const c = creds()
      const res = await fetch(`${httpUrl}/media/${id}`, { headers: { authorization: `Bearer ${c.id}:${c.token}` } })
      if (!res.ok) throw new Error('unduh media gagal: HTTP ' + res.status)
      return Buffer.from(await res.arrayBuffer())
    },
    async logout() {
      try {
        send({ t: 'device_logout' })
      } catch {}
      await auth.clear()
      closed = true
      setTimeout(() => ws?.close(), 300)
      update({ connection: 'close', lastDisconnect: { error: Object.assign(new Error('logout oleh bot'), { statusCode: DisconnectReason.loggedOut }) } })
    },
    end() {
      closed = true
      clearTimeout(saveTimer)
      ws?.close()
    },
  }

  connect()
  return sock
}

module.exports = { makeChatKuSocket, DisconnectReason, DEFAULT_URL }
