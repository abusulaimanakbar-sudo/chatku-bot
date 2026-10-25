// Contoh membaca argumen.
module.exports = {
  name: 'echo',
  aliases: ['ulang'],
  desc: 'Ulangi teks',
  usage: '<teks>',
  async run({ reply, text }) {
    await reply(text || 'Tulis teks setelah perintah, mis. !echo halo')
  },
}
