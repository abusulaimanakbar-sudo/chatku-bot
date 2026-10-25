const makeChatKuSocket = require('../src')
const { useMultiFileAuthState, DisconnectReason } = require('../src')

const URL = process.env.CHATKU_URL // kosong => wss://serverall.setorwa-der.com

async function start() {
  const auth = await useMultiFileAuthState('./auth_info')
  const sock = makeChatKuSocket({ url: URL, auth, printQRInTerminal: true, deviceName: 'Bot Contoh' })

  sock.ev.on('connection.update', ({ connection, lastDisconnect, qr, pairingCode, user }) => {
    if (qr) console.log(`Pindai QR di atas, atau masukkan kode ${pairingCode} di Setelan > Perangkat tertaut`)
    if (connection === 'open') console.log('Terhubung sebagai', user.name, `(${user.id})`)
    if (connection === 'close') {
      const code = lastDisconnect?.error?.statusCode
      if (code === DisconnectReason.loggedOut) return console.log('Sesi dicabut. Hapus folder auth_info lalu jalankan ulang.')
      setTimeout(start, 1500) // termasuk restartRequired setelah tautan pertama
    }
  })

  sock.ev.on('messages.upsert', async ({ messages }) => {
    for (const m of messages) {
      if (m.key.fromMe) continue
      const text = m.message?.text || ''
      if (text === '!ping') await sock.sendMessage(m.key.remoteJid, { text: 'pong' }, { quoted: m })
    }
  })
}

start()
