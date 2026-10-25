// Contoh menghapus pesan bot sendiri.
module.exports = {
  name: 'hapus',
  desc: 'Bot mengirim pesan lalu menghapusnya',
  async run({ sock, jid }) {
    const sent = await sock.sendMessage(jid, { text: 'Pesan ini akan hilang dalam 3 detik' })
    await new Promise((r) => setTimeout(r, 3000))
    await sock.deleteMessage(sent.key)
  },
}
