// Contoh balasan dinamis.
module.exports = {
  name: 'waktu',
  desc: 'Tanggal dan jam sekarang (WIB)',
  async run({ reply }) {
    const s = new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta', dateStyle: 'full', timeStyle: 'medium' })
    await reply(s + ' WIB')
  },
}
