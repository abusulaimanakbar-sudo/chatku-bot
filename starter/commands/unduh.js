// Contoh mengunduh media: kirim gambar/video/audio dengan keterangan !unduh.
module.exports = {
  name: 'unduh',
  desc: 'Kirim media dengan keterangan !unduh, bot melaporkan ukurannya',
  async run({ sock, m, reply }) {
    if (!['image', 'video', 'audio', 'sticker'].includes(m.type)) return reply('Kirim gambar, video, atau audio dengan keterangan !unduh')
    const buf = await sock.downloadMedia(m)
    await reply(`Media ${m.type} diterima: ${buf.length} byte`)
  },
}
