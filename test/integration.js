// Uji integrasi terhadap server ChatKu asli (server.js) yang dijalankan sebagai proses lokal.
// CHATKU_SERVER_DIR = folder berisi server.js + node_modules (default: ../../chatku-test-server)
const assert = require('assert')
const fs = require('fs')
const os = require('os')
const path = require('path')
const { spawn } = require('child_process')
const WebSocket = require('ws')
const makeChatKuSocket = require('../src')
const { useMultiFileAuthState } = require('../src')

const SERVER_DIR = process.env.CHATKU_SERVER_DIR || path.join(os.homedir(), 'chatku-test-server')
const PORT = 18780
const URL = `ws://127.0.0.1:${PORT}`

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const waitFor = (ev, name, pred, ms = 8000) =>
  new Promise((res, rej) => {
    const t = setTimeout(() => (ev.off(name, h), rej(new Error('timeout ' + name))), ms)
    const h = (u) => pred(u) && (clearTimeout(t), ev.off(name, h), res(u))
    ev.on(name, h)
  })

// "Aplikasi ChatKu" milik pengguna: soket biasa yang mendaftar akun lalu menyetujui tautan.
async function appUser(id) {
  const ws = new WebSocket(URL)
  const { EventEmitter } = require('events')
  const ev = new EventEmitter()
  ws.on('message', (raw) => {
    const f = JSON.parse(raw.toString())
    ev.emit('f', f)
  })
  await new Promise((r) => ws.on('open', r))
  const first = waitFor(ev, 'f', (f) => f.t === 'authok')
  ws.send(JSON.stringify({ t: 'auth', id, name: 'Pemilik Bot', device: 'HP' }))
  const ok = await first
  const send = (o) => ws.send(JSON.stringify(o))
  return { ws, ev, send, token: ok.token, close: () => ws.close() }
}

async function freeSlots(owner) {
  owner.send({ t: 'devices_list' })
  const list = (await waitFor(owner.ev, 'f', (f) => f.t === 'devices')).list
  for (const d of list.filter((x) => !x.current)) owner.send({ t: 'device_revoke', did: d.did })
  await sleep(500)
}

async function startBot(dir) {
  const auth = await useMultiFileAuthState(dir)
  const make = () => makeChatKuSocket({ url: URL, auth, deviceName: 'Bot Uji', logger: { error() {} } })
  return { auth, make }
}

;(async () => {
  const db = path.join(SERVER_DIR, 'chatku.db')
  for (const f of ['', '-wal', '-shm']) fs.rmSync(db + f, { force: true })
  const srv = spawn('node', ['server.js'], { cwd: SERVER_DIR, env: { ...process.env, PORT: String(PORT) }, stdio: 'ignore' })
  try {
    for (let i = 0; i < 50; i++) {
      try {
        if ((await fetch(`http://127.0.0.1:${PORT}/health`)).ok) break
      } catch {}
      await sleep(200)
    }

    const owner = await appUser('pemilikbot1')
    const friend = await appUser('temanbot01')

    for (const mode of ['qr', 'code']) {
      const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'chatku-'))
      const { auth, make } = await startBot(dir)
      await freeSlots(owner)
      let sock = make()
      const u = await waitFor(sock.ev, 'connection.update', (x) => x.qr)
      assert.match(u.qr, /^chatku:\/\/link\/[a-f0-9]+$/)
      assert.match(u.pairingCode, /^[A-Z2-9]{4}-[A-Z2-9]{4}$/)

      // pengguna menyetujui di aplikasi (QR memakai sid, kode memakai kode 8 huruf)
      const secret = mode === 'qr' ? u.qr.split('/').pop() : u.pairingCode
      const linked = waitFor(sock.ev, 'connection.update', (x) => x.isNewLogin)
      const closed = waitFor(sock.ev, 'connection.update', (x) => x.connection === 'close')
      owner.send({ t: 'link_approve', code: secret })
      const res = await waitFor(owner.ev, 'f', (f) => f.t === 'link_result')
      assert.equal(res.ok, true, 'persetujuan ditolak: ' + JSON.stringify(res))
      await linked
      assert.equal(auth.state.creds.id, 'pemilikbot1')
      const cl = (await closed).lastDisconnect.error
      assert.equal(cl.statusCode, 515, 'harus restartRequired')

      sock = make()
      const open = await waitFor(sock.ev, 'connection.update', (x) => x.connection === 'open')
      assert.equal(open.user.id, 'pemilikbot1')

      // pesan masuk dari teman -> bot
      friend.send({ t: 'lookup', id: 'pemilikbot1' })
      await sleep(200)
      const got = waitFor(sock.ev, 'messages.upsert', () => true)
      friend.send({ t: 'send', m: { id: 'aa' + Date.now().toString(16).padStart(14, '0'), to: 'pemilikbot1', k: 0, body: '!ping', ts: Date.now() } })
      const { messages } = await got
      assert.equal(messages[0].message.text, '!ping')
      assert.equal(messages[0].key.fromMe, false)
      assert.equal(messages[0].key.remoteJid, 'temanbot01')

      // bot membalas -> teman menerima
      const inbox = waitFor(friend.ev, 'f', (f) => f.t === 'msg' && f.m.body === 'pong')
      const sent = await sock.sendMessage('temanbot01', { text: 'pong' }, { quoted: messages[0] })
      assert.equal(sent.key.fromMe, true)
      const rec = (await inbox).m
      assert.equal(rec.sender, 'pemilikbot1')
      assert.equal(rec.reply, messages[0].key.id)

      // media: bot mengirim gambar, teman mengunduh
      const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR4nGP4z8DwHwAFAAH/q842iQAAAABJRU5ErkJggg==', 'base64')
      const imgIn = waitFor(friend.ev, 'f', (f) => f.t === 'msg' && f.m.k === 1)
      await sock.sendMessage('temanbot01', { image: png, caption: 'foto' })
      const im = (await imgIn).m
      const dl = await fetch(`http://127.0.0.1:${PORT}/media/${im.media}`, { headers: { authorization: 'Bearer temanbot01:' + friend.token } })
      assert.equal(dl.status, 200)
      assert.equal(Buffer.from(await dl.arrayBuffer()).equals(png), true)

      console.log('OK  tautan via', mode, '+ kirim/terima teks dan gambar')
      sock.end()
      await sleep(300)
    }

    // perangkat dicabut dari aplikasi -> bot keluar, kredensial dihapus
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'chatku-'))
    const { auth, make } = await startBot(dir)
    await freeSlots(owner)
    let sock = make()
    const u = await waitFor(sock.ev, 'connection.update', (x) => x.qr)
    owner.send({ t: 'link_approve', code: u.qr.split('/').pop() })
    await waitFor(sock.ev, 'connection.update', (x) => x.isNewLogin)
    await waitFor(sock.ev, 'connection.update', (x) => x.connection === 'close')
    sock = make()
    await waitFor(sock.ev, 'connection.update', (x) => x.connection === 'open')
    owner.send({ t: 'devices_list' })
    const devs = (await waitFor(owner.ev, 'f', (f) => f.t === 'devices' && f.list.some((d) => d.name === 'Bot Uji'))).list
    const bot = devs.find((d) => d.name === 'Bot Uji')
    const out = waitFor(sock.ev, 'connection.update', (x) => x.connection === 'close')
    owner.send({ t: 'device_revoke', did: bot.did })
    const err = (await out).lastDisconnect.error
    assert.equal(err.statusCode, 401)
    await sleep(200)
    assert.equal(auth.state.creds, null)
    console.log('OK  pencabutan dari aplikasi membersihkan sesi bot')
    console.log('Semua uji lulus')
    owner.close()
    friend.close()
  } finally {
    srv.kill()
  }
})().catch((e) => {
  console.error('GAGAL', e)
  process.exit(1)
})

