const makeChatKuSocket = require('chatku-bot')
const { useMultiFileAuthState, DisconnectReason } = require('chatku-bot')

async function start() {
  const auth = await useMultiFileAuthState('./auth_info')
  const sock = makeChatKuSocket({ auth, printQRInTerminal: true, deviceName: 'Bot Saya' })

  sock.ev.on('connection.update', ({ connection, lastDisconnect, qr, pairingCode, user }) => {
    if (qr) console.log(`Pindai QR di atas, atau masukkan kode ${pairingCode} di ChatKu > Setelan > Perangkat tertaut`)
    if (connection === 'open') console.log('Terhubung sebagai', user.name)
    if (connection === 'close') {
      if (lastDisconnect?.error?.statusCode === DisconnectReason.loggedOut) return console.log('Sesi dicabut. Hapus folder auth_info lalu jalankan ulang.')
      setTimeout(start, 1500)
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
