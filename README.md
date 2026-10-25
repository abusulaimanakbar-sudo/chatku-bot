# chatku-bot

SDK bot ChatKu bergaya Baileys. Bot menautkan diri sebagai **perangkat tertaut** lewat QR atau kode, lalu menerima dan mengirim pesan atas nama akun pemiliknya.

Pasang di proyek bot kamu:

```bash
npm install chatku-bot
```

Mau langsung jalan? Salin folder `starter/` (sudah memuat `chatku-bot` di dependencies), lalu `npm install && npm start`.

Atau jalankan contoh dari repositori ini:

```bash
npm install
node example/bot.js      # tampil QR + kode; setujui di ChatKu > Setelan > Perangkat tertaut
npm test                 # uji ke server.js asli (butuh salinan server, lihat bawah)
```

```js
const makeChatKuSocket = require('chatku-bot')
const { useMultiFileAuthState } = require('chatku-bot')

const auth = await useMultiFileAuthState('./auth_info')
const sock = makeChatKuSocket({ auth, printQRInTerminal: true })
sock.ev.on('messages.upsert', async ({ messages }) => {
  const m = messages[0]
  if (!m.key.fromMe) await sock.sendMessage(m.key.remoteJid, { text: 'halo' }, { quoted: m })
})
```

Setelah tautan pertama server menutup soket (`restartRequired`, 515); sambungkan ulang, token di `auth_info/creds.json` dipakai otomatis. Dicabut dari aplikasi => `loggedOut` (401) dan kredensial dihapus.

## Batasan server saat ini
- Maks 2 perangkat per akun (`MAX_DEVICES`): bot memakai satu slot.
- Bot berjalan sebagai akun pemiliknya.
- Klien tidak boleh mengirim pesan interaktif (tombol/daftar); itu khusus bot resmi.
- Batas kirim 40 pesan per 10 detik.

## Event
`connection.update`, `messages.upsert`, `messages.update`, `message-receipt.update`, `presence.update`, `contacts.update`, `groups.set`, `groups.update`, `groups.removed`.

## Metode
`sendMessage` (text, image, video, audio, sticker; quoted), `readMessages`, `sendPresenceUpdate`, `updateProfileName`, `updateProfileStatus`, `editMessage`, `deleteMessage`, `react`, `fetchUser`, `groupMetadata`, `groupCreate`, `groupParticipantsUpdate`, `downloadMedia`, `logout`, `end`.

## Uji
`npm test` menjalankan `server.js` asli dari `CHATKU_SERVER_DIR` (default `~/chatku-test-server`: salinan `server.js`, `bot.js`, `package.json` + `npm install`). Database uji dihapus tiap kali, jangan arahkan ke folder produksi.
