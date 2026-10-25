// Contoh memberi reaksi emoji pada pesan pengirim.
module.exports = {
  name: 'reaksi',
  desc: 'Beri reaksi pada pesanmu',
  usage: '[emoji]',
  async run({ sock, m, args }) {
    await sock.react(m.key, args[0] || '👍')
  },
}
