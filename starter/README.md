# Bot ChatKu saya

Proyek bot siap jalan dengan sistem perintah. Kembangkan sesukamu.

```bash
npm install
npm start
```

Pindai QR (atau masukkan kodenya) di ChatKu > Setelan > Perangkat tertaut. Lalu kirim `!menu` ke akunmu dari **akun lain**. Bot berjalan sebagai akunmu, jadi pesan yang kamu kirim sendiri diabaikan.

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
| `!unduh` | mengunduh media yang dikirim (kirim gambar dengan keterangan `!unduh`) |
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

Tidak perlu mendaftarkan di mana pun: berkas dimuat otomatis dan langsung muncul di `!menu`. Parameter `run`: `sock`, `m`, `args`, `text`, `jid`, `sender`, `isGroup`, `reply`, `prefix`, `commands`. Awalan dan jeda antar perintah diatur di `config.js`.

## Uji
`npm test` menjalankan uji handler tanpa jaringan.

## Alamat server
Bawaan SDK sudah menunjuk ke server ChatKu. Untuk server lain: `CHATKU_URL=wss://alamat-server node index.js`.

## Batasan
Maks 2 perangkat per akun (bot memakai satu), bot berjalan sebagai akun pemiliknya, dan tombol interaktif belum bisa dikirim.
