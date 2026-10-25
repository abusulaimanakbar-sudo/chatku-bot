// Contoh data grup (hanya jalan di grup).
module.exports = {
  name: 'grup',
  desc: 'Info grup: nama dan jumlah anggota',
  async run({ sock, jid, isGroup, reply }) {
    if (!isGroup) return reply('Perintah ini hanya untuk grup.')
    const g = sock.groupMetadata(jid)
    await reply(g ? `Grup: ${g.name}\nAnggota: ${g.members.length}` : 'Data grup belum tersedia.')
  },
}
