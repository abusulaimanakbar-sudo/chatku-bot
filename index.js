const makeChatKuSocket = require('./src')
const { useMultiFileAuthState, DisconnectReason } = require('./src')
const { createHandler } = require('./lib/handler')

// Alamat server: opsi `url`, atau variabel lingkungan CHATKU_URL. Kosong = bawaan SDK.
const URL = process.env.CHATKU_URL

async function start() {
  const auth = await useMultiFileAuthState('./auth_info')
  const sock = makeChatKuSocket({ url: URL, auth, printQRInTerminal: true, deviceName: 'Bot Saya' })
  const handle = createHandler(sock)

  sock.ev.on('connection.update', ({ connection, lastDisconnect, qr, pairingCode, user }) => {
    if (qr) console.log(`Pindai QR di atas, atau masukkan kode ${pairingCode} di ChatKu > Setelan > Perangkat tertaut`)
    if (connection === 'open') console.log('Terhubung sebagai', user.name)
    if (connection === 'close') {
      if (lastDisconnect?.error?.statusCode === DisconnectReason.loggedOut) return console.log('Sesi dicabut. Hapus folder auth_info lalu jalankan ulang.')
      setTimeout(start, 1500) // sambung ulang (termasuk setelah tautan pertama)
    }
  })

  sock.ev.on('messages.upsert', async ({ messages }) => {
    for (const m of messages) await handle(m)
  })
}

start()
