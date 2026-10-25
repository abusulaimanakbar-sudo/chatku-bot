// Contoh mengirim gambar. Sumber boleh Buffer, path berkas, atau URL http(s).
const PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAoAAAAKCAYAAACNMs+9AAAAFUlEQVR4nGP8z8Dwn4EIwDiqkL4KAQDWmQkI0WuAbQAAAABJRU5ErkJggg==',
  'base64'
)

module.exports = {
  name: 'gambar',
  desc: 'Kirim gambar contoh dengan keterangan',
  async run({ reply }) {
    await reply({ image: PNG, caption: 'Gambar contoh dari bot' })
  },
}
