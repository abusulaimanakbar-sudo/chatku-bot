// Menu dibuat otomatis dari semua berkas di commands/.
module.exports = {
  name: 'menu',
  aliases: ['help', 'bantuan'],
  desc: 'Tampilkan daftar perintah',
  async run({ reply, commands, prefix }) {
    const lines = commands.map((c) => `${prefix}${c.name}${c.usage ? ' ' + c.usage : ''} - ${c.desc}`)
    await reply('*Menu bot*\n' + lines.join('\n'))
  },
}
