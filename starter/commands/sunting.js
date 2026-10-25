// Contoh mengedit pesan bot sendiri.
module.exports = {
  name: 'sunting',
  desc: 'Bot mengirim pesan lalu mengubahnya',
  async run({ sock, jid }) {
    const sent = await sock.sendMessage(jid, { text: 'Pesan ini akan berubah...' })
    await new Promise((r) => setTimeout(r, 2000))
    await sock.editMessage(sent.key, 'Pesan sudah disunting.')
  },
}
