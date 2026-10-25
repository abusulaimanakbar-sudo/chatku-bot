// Uji handler perintah tanpa jaringan: `npm test`
const assert = require('assert')
const { loadCommands, createHandler } = require('../lib/handler')

const out = []
const sock = {
  sendMessage: async (jid, content, opt) => (out.push({ jid, content, opt }), { key: { id: 'x' + out.length } }),
  react: async (key, e) => out.push({ react: e }),
  sendPresenceUpdate: async () => {},
  groupMetadata: () => ({ name: 'Grup Uji', members: ['a', 'b', 'c'] }),
  editMessage: async () => {},
  deleteMessage: async () => {},
  downloadMedia: async () => Buffer.alloc(42),
}
const msg = (text, extra = {}) => ({ key: { id: 'm1', remoteJid: 'teman1', fromMe: false }, isGroup: false, type: 'text', messageTimestamp: Date.now(), message: { text }, ...extra })
const gap = () => new Promise((r) => setTimeout(r, 1100))

;(async () => {
  const commands = loadCommands()
  assert.ok(commands.size >= 10, 'semua perintah termuat')
  const handle = createHandler(sock, commands)
  const last = () => out[out.length - 1]

  await handle(msg('!ping'))
  assert.match(last().content.text, /^pong/)
  await gap()
  await handle(msg('!menu'))
  assert.match(last().content.text, /!echo <teks>/)
  await gap()
  await handle(msg('!echo halo dunia'))
  assert.equal(last().content.text, 'halo dunia')
  await gap()
  await handle(msg('!gambar'))
  assert.ok(Buffer.isBuffer(last().content.image))
  await gap()
  await handle(msg('!unduh', { type: 'image' }))
  assert.match(last().content.text, /42 byte/)
  await gap()
  await handle(msg('!grup', { isGroup: true, key: { id: 'm2', remoteJid: 'g1', participant: 'a', fromMe: false } }))
  assert.match(last().content.text, /Anggota: 3/)
  await gap()
  await handle(msg('!reaksi'))
  assert.equal(last().react, '👍')

  const n = out.length
  await handle(msg('halo biasa'))
  await handle(msg('!tidakada'))
  await handle(msg('!ping', { key: { id: 'm3', remoteJid: 'teman1', fromMe: true } }))
  assert.equal(out.length, n, 'pesan biasa, perintah tak dikenal, dan pesan sendiri diabaikan')

  await gap()
  await handle(msg('!ping'))
  await handle(msg('!ping'))
  assert.equal(out.length, n + 1, 'cooldown menahan spam')
  console.log('Semua uji handler lulus')
})().catch((e) => (console.error('GAGAL', e), process.exit(1)))
