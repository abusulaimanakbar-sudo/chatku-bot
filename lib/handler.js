const fs = require('fs')
const path = require('path')
const config = require('../config')

// Muat semua berkas di folder commands/. Tiap perintah: { name, aliases?, desc, usage?, run(ctx) }
function loadCommands(dir = path.join(__dirname, '..', 'commands')) {
  const map = new Map()
  for (const f of fs.readdirSync(dir).filter((x) => x.endsWith('.js'))) {
    const cmd = require(path.join(dir, f))
    if (!cmd.name || typeof cmd.run !== 'function') throw new Error(`commands/${f}: wajib punya name dan run()`)
    for (const n of [cmd.name, ...(cmd.aliases || [])]) map.set(n, cmd)
  }
  return map
}

function createHandler(sock, commands = loadCommands()) {
  const last = new Map()
  const unique = [...new Set(commands.values())]

  return async function handle(m) {
    if (m.key.fromMe) return // bot berjalan sebagai akunmu: abaikan pesan yang kamu kirim sendiri
    const text = (m.message?.text || '').trim()
    if (!text.startsWith(config.prefix)) return

    const [raw, ...args] = text.slice(config.prefix.length).split(/\s+/)
    const cmd = commands.get(raw.toLowerCase())
    if (!cmd) return

    const sender = m.isGroup ? m.key.participant : m.key.remoteJid
    const t = Date.now()
    if (t - (last.get(sender) || 0) < config.cooldownMs) return
    last.set(sender, t)

    const ctx = {
      sock,
      m,
      args,
      text: args.join(' '),
      jid: m.key.remoteJid,
      sender,
      isGroup: m.isGroup,
      prefix: config.prefix,
      commands: unique,
      reply: (content) => sock.sendMessage(m.key.remoteJid, typeof content === 'string' ? { text: content } : content, { quoted: m }),
    }
    try {
      await cmd.run(ctx)
    } catch (e) {
      console.error(`[${cmd.name}]`, e.message)
      await ctx.reply('Perintah gagal dijalankan.').catch(() => {})
    }
  }
}

module.exports = { loadCommands, createHandler }
