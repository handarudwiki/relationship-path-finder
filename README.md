# Relationship Path Finder — PT KasirNusa (Sales Track, Tim 3)

Context graph untuk menjawab: **"Lewat siapa jalur terbaik menuju decision maker?"**

Fully Next.js (App Router + TypeScript), tanpa database eksternal. Graph dibangun
di memori dari dataset CSV/JSONL saat server start, jadi gampang di-deploy
(Vercel / Node host) dan jalan di dataset penuh.

## Menjalankan

```bash
cd rpf
npm install
cp .env.example .env.local   # lalu isi OPENROUTER_API_KEY (untuk Magic Recommendation)
npm run dev      # http://localhost:3000
```

Tanpa `OPENROUTER_API_KEY`, aplikasi tetap jalan; kartu Magic Recommendation
menampilkan temuan otomatis berbasis aturan, dan kartu Draft Pesan Intro
menampilkan template tanpa AI.

Build produksi:

```bash
npm run build && npm run start
```

## Arsitektur

```
data/                 15 file CSV/JSONL (copy dari dataset)
lib/
  data.ts             baca & parse CSV/JSONL (cache per proses)
  graph.ts            bangun context graph + Dijkstra (terkuat) & BFS (terpendek)
  analyze.ts          deteksi decision maker, referensi, template draft pesan
  recommend.ts        Magic Recommendation & draft pesan AI: konteks dari data + panggilan AI
  types.ts            tipe bersama
app/
  page.tsx            UI 1 halaman
  MagicRecommendation.tsx kartu saran AI
  DraftPesanAI.tsx        kartu draft pesan intro dari AI
  api/analyze/route.ts    GET ?account=P01  -> analisis lengkap
  api/recommend/route.ts  GET ?account=P01  -> Magic Recommendation (dibuat sekali lalu terkunci)
  api/draft/route.ts      GET ?account=P01  -> draft pesan intro AI (dibuat sekali lalu terkunci)
  api/prospects/route.ts  GET -> daftar prospek
```

## Cara kerja (ringkas)

1. **Context graph** menghubungkan 5 sumber: CRM accounts, contacts,
   employment history, deals, dan interactions. Node = akun/kontak/karyawan.
   Edge berbobot (0..1) sesuai kekuatan relasi, dihitung per pasangan dari data
   memakai model tie strength Gilbert & Karahalios (2009). Penjelasan lengkap:
   [docs/pembobotan-relasi.md](docs/pembobotan-relasi.md).

2. **Deteksi decision maker** mengutamakan **sinyal eksplisit di interaksi**
   (mis. "keputusan ada di GM Operations") di atas jabatan tertinggi di CRM.
   Ini pembeda penting: Direktur Utama belum tentu pengambil keputusan nyata.

3. **Path finder** mengembalikan dua jalur:
   - **Terpendek** (BFS, paling sedikit perantara)
   - **Terkuat** (Dijkstra pada `-log(bobot)`, memaksimalkan produk bobot)

   Jalur hanya melewati orang; akun hanya boleh jadi titik awal atau akhir,
   supaya setiap jalur menyebut siapa yang bisa dimintai tolong. Relasi ke akun
   (mis. `CHAMPION_DARI`, `ACCOUNT_OWNER`) tetap tampil di tiap langkah sebagai
   konteks "via akun". Teks bukti di tampilan jalur tidak memuat ID; bukti
   lengkap dengan ID tetap dipakai sebagai konteks AI.

4. **Referensi pelanggan** dipilih dari pelanggan sehat (health Hijau) di
   industri sejenis, dengan prioritas bila decision maker punya **relasi historis**
   dengan pelanggan itu (jalur hangat).

5. **Magic Recommendation** menyusun saran pendekatan per prospek dengan AI
   (DeepSeek lewat OpenRouter):
   - Server mengumpulkan konteks dari data: decision maker dan riwayat kerjanya,
     jalur beserta bobotnya, interaksi, relasi tersembunyi, kondisi pelanggan
     jembatan (kontrak, janji fitur, eskalasi), riwayat melawan pesaing,
     keputusan diskon, pelanggan serupa, dan status fitur.
   - AI wajib mencantumkan ID bukti (I0343, D-2025-11, FEAT-07, …). ID yang tidak
     ada di data dibuang otomatis.
   - Jawaban yang terpotong atau kosong diminta ulang sekali.
   - Rekomendasi dibuat sekali per prospek lalu dikunci di
     `cache/magic-recommendation.json`, jadi isinya tidak berubah walau server
     dinyalakan ulang. Tidak ada tombol "buat ulang". Rekomendasi hanya dibuat
     ulang otomatis kalau data prospek itu berubah. Untuk membuat ulang secara
     manual, hapus entri prospeknya dari file tersebut.
   - API key hanya dibaca di server dari `.env.local` dan tidak pernah dikirim
     ke browser. `OPENROUTER_DATA_COLLECTION=deny` melarang provider menyimpan data.

6. **Draft pesan intro** juga ditulis AI, mengikuti Magic Recommendation yang
   sudah terkunci untuk prospek itu:
   - AI memilih penerima dan pengirim sesuai rekomendasi, misalnya Sari ke
     Rina untuk P01 karena keduanya pernah bertemu di QBR Januari 2026.
   - Pesan dibaca pihak luar, jadi AI dilarang menyebut informasi internal
     (health, NPS, nilai kontrak, diskon, log keputusan, bobot relasi, ID bukti),
     menjanjikan fitur yang belum rilis, atau mengklaim seseorang sudah bersedia
     jadi referensi bila data tidak mencatatnya.
   - Server membuang ID bukti yang tetap muncul di isi pesan; kalau masih ada,
     jawaban diminta ulang.
   - Sapaan "Pak"/"Bu" hanya dipakai kalau sapaan itu memang tercatat di
     interaksi. Data tidak mencatat jenis kelamin, jadi sisanya diganti
     "Bapak/Ibu" untuk penerima dan nama saja untuk orang lain.
   - ID bukti dasar pesan tampil terpisah sebagai catatan internal.
   - Dikunci di `cache/draft-pesan.json` dengan aturan yang sama: tidak ada
     tombol "buat ulang", dibuat ulang otomatis hanya kalau data prospek atau
     rekomendasinya berubah. Kalau AI gagal, kartu menampilkan template tanpa AI.

## Temuan kunci di dataset

- **P01 Grup Ritel Mandala**: decision maker sebenarnya bukan Direktur Utama,
  tapi **Rina Hapsari (GM Operations)** — ditunjuk eksplisit di interaksi I0343.
  Rina adalah **mantan champion di C01 (Kopi Lintas Nusantara)**, pelanggan happy
  kami. Jalur terbaik = lewat hubungan lama itu, bukan email dingin.
- **P04 Nirwana Hotel & Resto**: Dirut minta referensi pelanggan sejenis sebelum
  tanda tangan (I0335). Sistem menyarankan **Saiyo Group** (Resto, Enterprise, sehat).

## Catatan deploy

Deploy ke Vercel: set root ke folder `rpf/`. Folder `data/` ikut ter-bundle
karena dibaca lewat `process.cwd()/data` saat runtime server.

Isi variabel dari `.env.example` di menu Environment Variables Vercel.
`.env.local` sengaja di-ignore git supaya API key tidak ikut ter-push.
