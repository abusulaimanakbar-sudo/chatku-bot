// Contoh indikator "sedang mengetik".
module.exports = {
  name: 'ketik',
  desc: 'Bot berpura-pura mengetik lalu membalas',
  async run({ sock, jid, reply }) {
    await sock.sendPresenceUpdate('composing', jid)
    await new Promise((r) => setTimeout(r, 1500))
    await reply('Selesai mengetik.')
  },
}
