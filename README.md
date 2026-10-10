# Relationship Path Finder

Proyek Tim 3 untuk Sales Track PT KasirNusa.

Sales biasanya sudah tahu siapa yang ingin didekati di sebuah prospek, tapi belum tentu tahu harus lewat siapa. Aplikasi ini mencari jawabannya dari data CRM KasirNusa.

## Fitur

- Pilih prospek, lalu aplikasi menunjukkan decision maker beserta buktinya.
- Dua jalur ke decision maker: jalur terkuat (hubungan paling bisa diandalkan) dan jalur terpendek (perantara paling sedikit).
- Magic Recommendation: saran pendekatan dari AI untuk tiap prospek, lengkap dengan ID data yang jadi dasarnya.
- Draft pesan intro dari AI yang mengikuti saran tersebut, tinggal disalin.
- Query bebas untuk mencari jalur antara dua orang atau akun mana pun.
- Relasi tersembunyi, yaitu kontak di prospek yang ternyata punya hubungan dengan pelanggan KasirNusa.
- Peringatan lintas track: champion pelanggan yang sudah pindah ke perusahaan lain. Ini risiko retensi sekaligus peluang sales.
- Halaman Explore Graph untuk melihat seluruh graph dan memfilter per jenis relasi.

## Menjalankan

Butuh Node.js 20.9 atau lebih baru.

```bash
npm install
cp .env.example .env.local
npm run dev
```

Lalu buka http://localhost:3000.

`OPENROUTER_API_KEY` di `.env.local` hanya diperlukan untuk membuat hasil AI baru. Hasil AI untuk P01–P05 sudah tersimpan di folder `cache/`, jadi tanpa key pun rekomendasi dan draft pesannya tetap tampil. Kalau key kosong dan hasil untuk sebuah prospek belum ada, kartu AI menampilkan versi berbasis aturan.

Build produksi: `npm run build`, lalu `npm run start`.

## Cara kerja

### Data dan graph

Data diambil dari file CSV/JSONL di folder `data/`, tanpa database. Saat server jalan, akun, kontak, riwayat kerja kontak, deal, karyawan, dan log interaksi dirangkai menjadi graph di memori: 215 node (10 karyawan, 160 kontak, 45 akun) dan 757 relasi dari delapan jenis.

| Relasi | Arti |
|---|---|
| `BEKERJA_DI` | kontak bekerja di sebuah akun |
| `PERNAH_BEKERJA_DI` | kontak pernah bekerja di akun itu |
| `SALING_KENAL` | dua kontak pernah satu kantor di periode yang sama |
| `BERINTERAKSI` | pernah berkirim email atau bertemu |
| `ACCOUNT_OWNER` | karyawan yang memegang akun |
| `MENANGANI_DEAL` | karyawan yang menangani deal di akun |
| `CHAMPION_DARI` | kontak yang tercatat sebagai champion akun |
| `REKAN_KERJA` | sesama karyawan KasirNusa |

### Bobot relasi

Setiap relasi diberi bobot 0 sampai 1. Angkanya tidak kami tentukan sendiri, tapi dihitung dari data dengan model tie strength Gilbert & Karahalios (2009): kapan terakhir berhubungan, seberapa sering, sudah berapa lama kenal, ada tidaknya hubungan kerja atau layanan, dan berapa kenalan bersama. Rumus lengkap dan contoh hitungannya ada di [docs/pembobotan-relasi.md](docs/pembobotan-relasi.md).

### Mencari jalur

Jalur terkuat dicari dengan Dijkstra yang memaksimalkan hasil kali bobot sepanjang jalur, sedangkan jalur terpendek dengan BFS.

Jalur hanya boleh lewat orang. Akun cuma boleh jadi titik awal atau akhir, karena yang bisa memperkenalkan adalah orangnya, bukan perusahaannya. Relasi ke akun tetap ditampilkan di tiap langkah. Di P01 misalnya, langkah Sari ke Rina menunjukkan Sari sebagai `ACCOUNT_OWNER` Kopi Lintas Nusantara dan Rina sebagai `CHAMPION_DARI` akun yang sama.

### Decision maker

Decision maker belum tentu orang dengan jabatan tertinggi. Aplikasi lebih dulu mencari petunjuk di interaksi, misalnya email yang menyebut siapa yang memegang keputusan. Kalau tidak ada, baru dipakai jabatan tertinggi di CRM.

### Magic Recommendation dan draft pesan

Untuk tiap prospek, server mengumpulkan konteks dari data: decision maker dan riwayat kerjanya, jalur dan bobotnya, interaksi, kondisi pelanggan yang terkait, riwayat melawan pesaing, keputusan diskon, kontrak, dan status fitur. Konteks itu dikirim ke DeepSeek lewat OpenRouter. AI wajib menyebut ID data yang jadi dasarnya, dan ID yang tidak ada di data dibuang.

Draft pesan mengikuti rekomendasi itu. Karena pesannya dibaca orang di luar KasirNusa, AI tidak boleh menyebut data internal seperti NPS, nilai kontrak, atau diskon. AI juga tidak boleh menjanjikan fitur yang belum rilis, atau menebak sapaan Pak/Bu yang tidak tercatat di data.

Hasil AI dibuat sekali per prospek lalu disimpan di `cache/magic-recommendation.json` dan `cache/draft-pesan.json`, jadi isinya tidak berubah-ubah saat demo. Hasilnya baru dibuat ulang kalau data prospek itu berubah. Untuk membuat ulang secara manual, hapus entri prospeknya dari file tersebut.

API key hanya dibaca di server. `OPENROUTER_DATA_COLLECTION=deny` di `.env.example` meminta provider tidak menyimpan data yang dikirim.

## Temuan dari data

- P01 Grup Ritel Mandala. Menurut email I0343, keputusan pengadaan ada di GM Operations yang baru bergabung, Rina Hapsari, bukan di Direktur Utama. Rina sebelumnya champion di Kopi Lintas Nusantara, salah satu pelanggan KasirNusa, dan pernah bertemu Sari Puspita di QBR Januari 2026. Jalan masuk terbaik adalah lewat Sari.
- P04 Nirwana Hotel & Resto. Direktur Utama menunda tanda tangan sampai ada referensi dari pengguna yang mirip (I0335). Saiyo Group cocok sebagai referensi, dan CFO-nya, Budi Santoso, pernah satu kantor dengan Dirut Nirwana.

Temuan lainnya ada di [docs/temuan-menarik.md](docs/temuan-menarik.md).

## Struktur folder

```
data/          dataset CSV/JSONL
cache/         hasil AI yang sudah dikunci
docs/          penjelasan pembobotan dan temuan
lib/
  data.ts        membaca file data
  graph.ts       membangun graph, menghitung bobot, mencari jalur
  analyze.ts     decision maker, referensi, relasi tersembunyi
  recommend.ts   Magic Recommendation dan draft pesan
  types.ts
app/
  page.tsx       halaman utama
  explore/       halaman Explore Graph
  api/           endpoint (lihat di bawah)
```

## API

| Endpoint | Isi |
|---|---|
| `GET /api/prospects` | daftar prospek |
| `GET /api/analyze?account=P01` | decision maker, jalur, dan referensi |
| `GET /api/recommend?account=P01` | Magic Recommendation |
| `GET /api/draft?account=P01` | draft pesan intro |
| `GET /api/path?from=E06&to=K028` | jalur antara dua node |
| `GET /api/search?q=rina` | cari node berdasarkan nama, jabatan, atau akun |
| `GET /api/insights` | relasi tersembunyi dan temuan lintas track |
| `GET /api/graph?rel=CHAMPION_DARI` | seluruh graph, bisa difilter per relasi |
| `GET /api/graphstats` | jumlah node dan relasi per jenis |

## Deploy

Bisa di Vercel atau server Node biasa. Isi environment variable sesuai `.env.example`. File `.env.local` tidak ikut di-commit supaya API key tidak tersebar.
