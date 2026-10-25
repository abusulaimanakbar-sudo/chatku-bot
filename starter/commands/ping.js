// Contoh paling sederhana: balas pesan.
module.exports = {
  name: 'ping',
  desc: 'Cek bot hidup dan hitung jeda',
  async run({ reply, m }) {
    const ms = Date.now() - m.messageTimestamp
    await reply(`pong (${Math.max(0, ms)} ms)`)
  },
}
