// Contoh membaca data pesan: pengirim, obrolan, jenis.
module.exports = {
  name: 'info',
  desc: 'Info pesan dan pengirim',
  async run({ reply, m, sender, jid, isGroup, sock }) {
    const g = isGroup ? sock.groupMetadata(jid) : null
    const where = isGroup ? ` (grup${g ? ': ' + g.name : ''})` : ''
    await reply([`Pengirim: ${m.pushName || '-'} (${sender})`, `Obrolan: ${jid}${where}`, `Jenis pesan: ${m.type}`, `ID pesan: ${m.key.id}`].join('\n'))
  },
}
