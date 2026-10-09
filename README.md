# Relationship Path Finder — PT KasirNusa (Sales Track, Tim 3)

Context graph untuk menjawab: **"Lewat siapa jalur terbaik menuju decision maker?"**

Fully Next.js (App Router + TypeScript), tanpa database eksternal. Graph dibangun
di memori dari dataset CSV/JSONL saat server start, jadi gampang di-deploy
(Vercel / Node host) dan jalan di dataset penuh.

## Menjalankan

```bash
cd rpf
npm install
npm run dev      # http://localhost:3000
```

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
  analyze.ts          deteksi decision maker, referensi, draft pesan
  types.ts            tipe bersama
app/
  page.tsx            UI 1 halaman
  api/analyze/route.ts    GET ?account=P01  -> analisis lengkap
  api/prospects/route.ts  GET -> daftar prospek
```

## Cara kerja (ringkas)

1. **Context graph** menghubungkan 5 sumber: CRM accounts, contacts,
   employment history, deals, dan interactions. Node = akun/kontak/karyawan.
   Edge berbobot (0..1) sesuai kekuatan relasi:
   `CHAMPION_DARI` 0.95, `BEKERJA_DI` 0.9, `SALING_KENAL` 0.7, `BERINTERAKSI` 0.55, dst.

2. **Deteksi decision maker** mengutamakan **sinyal eksplisit di interaksi**
   (mis. "keputusan ada di GM Operations") di atas jabatan tertinggi di CRM.
   Ini pembeda penting: Direktur Utama belum tentu pengambil keputusan nyata.

3. **Path finder** mengembalikan dua jalur:
   - **Terpendek** (BFS, paling sedikit perantara)
   - **Terkuat** (Dijkstra pada `-log(bobot)`, memaksimalkan produk bobot)

4. **Referensi pelanggan** dipilih dari pelanggan sehat (health Hijau) di
   industri sejenis, dengan prioritas bila decision maker punya **relasi historis**
   dengan pelanggan itu (jalur hangat).

5. **Draft pesan intro** dibuat otomatis, menyesuaikan apakah ada jalur hangat.

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
