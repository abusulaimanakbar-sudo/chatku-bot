# chatku-bot

Bot dasar dan SDK untuk ChatKu, bergaya Baileys. Bot menautkan diri sebagai **perangkat tertaut** lewat QR atau kode, lalu menerima dan membalas pesan atas nama akun pemiliknya.

## Mulai cepat

```bash
git clone https://github.com/abusulaimanakbar-sudo/chatku-bot.git
cd chatku-bot
npm install
npm start
```

(Atau unduh zip dari GitHub, masuk ke foldernya, lalu `npm install` dan `npm start`.)

1. Terminal menampilkan QR dan kode tautan.
2. Di ChatKu buka **Setelan > Perangkat tertaut**, lalu pindai QR atau masukkan kodenya.
3. Dari **akun lain**, kirim `!menu` ke akunmu. Bot berjalan sebagai akunmu, jadi pesan yang kamu kirim sendiri diabaikan.

Sesi tersimpan di folder `auth_info/`; jalankan lagi `npm start` tanpa menautkan ulang. Hapus folder itu untuk menautkan akun lain.

## Struktur

```
index.js            koneksi dan penanganan pesan
config.js           awalan perintah (!) dan jeda antar perintah
commands/           satu berkas = satu perintah (dimuat otomatis)
lib/handler.js      pemuat dan pengirim perintah
src/                SDK (makeChatKuSocket, useMultiFileAuthState)
test/               uji handler (npm test) dan uji integrasi ke server
```

## Perintah contoh
| Perintah | Menunjukkan |
|---|---|
| `!ping` | balasan sederhana dengan kutipan |
| `!menu` | menu otomatis dari semua berkas di `commands/` |
| `!echo <teks>` | membaca argumen |
| `!waktu` | balasan dinamis |
| `!ketik` | indikator sedang mengetik |
| `!reaksi [emoji]` | reaksi emoji |
| `!info` | data pengirim, obrolan, jenis pesan |
| `!gambar` | mengirim gambar |
| `!unduh` | mengunduh media (kirim gambar dengan keterangan `!unduh`) |
| `!sunting` | mengedit pesan bot |
| `!hapus` | menghapus pesan bot |
| `!grup` | info grup (jalankan di grup) |

## Menambah perintah
Buat berkas baru di `commands/`, misalnya `commands/halo.js`:

```js
module.exports = {
  name: 'halo',
  aliases: ['hai'],
  desc: 'Menyapa',
  usage: '[nama]',
  async run({ reply, text }) {
    await reply(`Halo ${text || 'kawan'}!`)
  },
}
```

Tidak perlu didaftarkan: berkas dimuat otomatis dan langsung muncul di `!menu`. Parameter `run`: `sock`, `m`, `args`, `text`, `jid`, `sender`, `isGroup`, `reply`, `prefix`, `commands`.

## Pakai sebagai library
Di proyek lain (bukan di folder ini):

```bash
npm install chatku-bot
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

Server lain: opsi `url` atau `CHATKU_URL=wss://alamat-server npm start`.

**Event:** `connection.update`, `messages.upsert`, `messages.update`, `message-receipt.update`, `presence.update`, `contacts.update`, `groups.set`, `groups.update`, `groups.removed`.

**Metode:** `sendMessage` (text, image, video, audio, sticker; quoted), `readMessages`, `sendPresenceUpdate`, `updateProfileName`, `updateProfileStatus`, `editMessage`, `deleteMessage`, `react`, `fetchUser`, `groupMetadata`, `groupCreate`, `groupParticipantsUpdate`, `downloadMedia`, `logout`, `end`.

## Batasan
- Bot berjalan sebagai akun pemiliknya; maks 2 perangkat per akun (bot memakai satu).
- Klien tidak bisa mengirim pesan interaktif (tombol/daftar).
- Batas server: 40 pesan per 10 detik.
- Butuh Node.js 18 ke atas.

## Uji
`npm test` menguji handler tanpa jaringan. `npm run test:integration` menjalankan `server.js` asli dari `CHATKU_SERVER_DIR` (database uji dihapus tiap kali, jangan arahkan ke server produksi).
