# Temuan Menarik untuk Kategori Relationship Path Finder

Bahan untuk menjawab pertanyaan juri: "Apa temuan menarik dari data yang sesuai dengan kategori ini?"

Semua temuan di bawah dicocokkan langsung dengan dataset di folder `data/`, yang mencatat kejadian sampai **30 September 2026**. Setiap poin disertai ID bukti (interaksi `I…`, keputusan `D-…`, fitur `FEAT-…`, deal `DL-…`) supaya bisa ditunjukkan saat ditanya.

## Ringkasan

| # | Temuan | Nilai yang dipertaruhkan | Bukti utama |
|---|---|---|---|
| 1 | Pengambil keputusan P01 bukan Dirut, melainkan mantan orang dalam pelanggan kita | Rp252 jt | I0343, riwayat kerja Rina |
| 2 | Jembatan ke P01 sedang retak karena janji fitur yang belum ditepati | Rp252 jt + Rp150 jt | I0051, I0066, D-2025-11, FEAT-07, I0331 |
| 3 | Referensi yang ditunggu Dirut P04 ternyata kenalan lamanya | Rp147 jt | I0335, I0300, riwayat kerja Budi & Hartono |
| 4 | Teras Kafe (P02) mengulang kasus Kafe Senja | Rp63 jt | I0348, D-2025-02, D-2025-06 |
| 5 | P03 minta referensi apotek, aplikasi tidak menemukannya | Rp37,8 jt | I0334, FEAT-05 |
| 6 | Label champion di CRM tidak menjamin relasinya hangat | 5 champion tanpa kontak | Log interaksi, bobot berbasis jurnal |
| 7 | Prospek terbesar kedua tidak punya satu kontak pun | Rp168 jt | CRM P05 |

**Angka pembuka:** 5 prospek dengan total pipeline Rp667,8 jt. Graph berisi 215 node (45 akun, 160 kontak, 10 karyawan) dan 757 relasi, dibangun dari 350 interaksi (Okt 2025–Sep 2026) dan 217 riwayat kerja.

---

## 1. P01 Grup Ritel Mandala: pengambil keputusan yang sebenarnya bukan Dirut

**Nilai:** Rp252 jt per tahun · 60 gerai · tahap Proposal · pemegang deal Bagus Prakoso

**Temuan**
- Kalau hanya melihat jabatan di CRM, pengambil keputusannya adalah Direktur Utama, Steven Wijaya. Kenyataannya berbeda.
- IT Manager P01, Fajar Nugraha, menulis ke Bagus (I0343, 24 Sep 2026):
  > "Mas Bagus, proposal sudah saya teruskan ke GM Operations yang baru bergabung awal September. Keputusan pengadaan sistem kasir ada di beliau, saya hanya menilai sisi teknis."
- GM Operations itu adalah **Rina Hapsari**. Riwayat kerjanya:
  - PT Kreasi Kuliner, Operations Supervisor (Jun 2016 – Feb 2021)
  - **Kopi Lintas Nusantara (C01), Head of Operations (Mar 2021 – 15 Agu 2026)**. C01 adalah pelanggan kita: paket Enterprise, 42 outlet.
  - Grup Ritel Mandala, GM Operations (sejak 1 Sep 2026)
- Di CRM, Rina **masih tercatat sebagai champion C01**, padahal sudah pindah.

**Jalur terkuat:** Bagus → Sari Puspita (AM C01) → Rina, skor 0,462.
- Sari pernah bertemu Rina langsung di Quarterly Business Review C01 (I0107, 9 Jan 2026).
- Sari juga aktif menangani C01: 13 interaksi, terakhir 25 Sep 2026.
- Rina 5,5 tahun di C01 dan baru keluar 46 hari sebelum data berakhir.

**Rina adalah penghubung super.** Dia punya 10 mantan rekan kerja yang kini tersebar di 7 akun pelanggan:

| Akun pelanggan | Mantan rekan kerja Rina |
|---|---|
| C01 Kopi Lintas Nusantara | Michael Tanoto (Dirut), Fikri Ramadhan (IT Supervisor), Yoga Pratama (CFO) |
| C08 Toko Elektronik Cahaya | Vina Purnomo, Agus Anggraini |
| C09 Apotek Medika Farma | Putri Santoso |
| C27 Apotek Kimia Sejahtera | Reza Setiawan |
| C28 Toko Mainan Ceria | Cahyo Kurniawan |
| C33 Kopi Kenangan Desa | Indra Lestari |
| C39 Es Teh Indonesia Lokal | Krisna Anggraini |

**Kenapa penting:** ini contoh paling jelas bahwa jabatan tertinggi belum tentu pengambil keputusan, dan bahwa jalur hangat tersembunyi di riwayat kerja, bukan di data deal.

---

## 2. Twist: jembatan ke P01 sedang retak

**Nilai:** Rp252 jt (deal P01) + Rp149,9 jt (perpanjangan C01, jatuh tempo 15 Des 2026)

Kopi Lintas Nusantara adalah jalur hangat sekaligus referensi untuk P01. Tapi data dari 6 file menunjukkan hubungan dengan C01 sedang bermasalah, dan **orang yang paling merasakannya adalah Rina sendiri**.

**Kronologi**

| Tanggal | Kejadian | Bukti |
|---|---|---|
| 20 Nov 2025 | Rina mensyaratkan perpanjangan: diskon volume **dan** "integrasi ke Accurate harus sudah jalan tahun depan. Tim keuangan kami sangat bergantung pada itu." | I0051 |
| 25 Nov 2025 | Sari minta persetujuan VP untuk diskon 15%: "Mereka mau tanda tangan bila integrasi akuntansi pasti rilis. Info dari produk targetnya Q3 2026." | I0054 |
| 28 Nov 2025 | Diskon 15% disetujui sebagai **pengecualian**, dengan alasan "komitmen integrasi akuntansi Q3 2026". Status janji: *Belum ditepati*. | I0061, D-2025-11 |
| 1 Des 2025 | Sari ke Rina: "Integrasi ke Accurate dan Jurnal dijadwalkan rilis Q3 2026; **Ibu akan jadi pengguna pertama**." | I0066 |
| 15 Jun 2026 | Rina menagih: "kapan pastinya integrasi rilis? Kami butuh untuk tutup buku Q3. CFO baru kami mulai Juli dan akan menanyakan ini." | I0223 |
| 17 Jun 2026 | Sari: "masih sesuai rencana Q3." | I0224 |
| 14 Jul 2026 | Eskalasi ke Head of Product: "belum ada tanggal dari produk". Status: *Menunggu*. | D-2026-08 |
| Jul 2026 | FEAT-07 (Integrasi akuntansi Jurnal & Accurate) berstatus *Dalam pengembangan*, target diubah dari 2026-Q3 menjadi *Belum ditetapkan*. | features.csv |
| 15 Agu 2026 | Rina keluar dari C01, lalu 1 Sep bergabung dengan P01. | Riwayat kerja |
| 18 Sep 2026 | CFO baru C01, Yoga Pratama: "sedang mengevaluasi seluruh vendor sistem… menyebut KasirPro menawarkan integrasi akuntansi bawaan… bertanya mengapa integrasi yang dijanjikan belum ada. **Belum ada komitmen renewal.**" | I0331 |
| 30 Sep 2026 | Q3 2026 berakhir. Janji tidak ditepati. | – |

Konteks tambahan:
- Dari 17 keputusan diskon di log, 15% untuk C01 adalah diskon tertinggi yang pernah disetujui, dan diberikan khusus karena janji FEAT-07. Semua 7 permintaan di atas 15% ditolak.
- C01 punya 13 tiket support: 3 masih terbuka dan 3 berprioritas tinggi.

**Kenapa penting**
- Aplikasi saat ini menyarankan "minta Kopi Lintas Nusantara memberi referensi langsung" untuk P01, dan menjadikan C01 referensi untuk P02. Itu berisiko: CFO C01 sedang membandingkan dengan KasirPro.
- Rina menerima janji itu secara pribadi. Kalau KasirNusa mendekatinya tanpa membahas FEAT-07, pendekatan "hangat" ini bisa berbalik.

**Rekomendasi**
1. Sari mendekati Rina secara personal, mengakui keterlambatan, dan membawa tanggal FEAT-07 yang pasti dari tim produk.
2. Tunda permintaan referensi ke C01 sampai urusan perpanjangan dengan CFO-nya beres.
3. Satu temuan ini menyentuh dua tim: Sales (P01) dan Customer Success (retensi C01).

---

## 3. P04 Nirwana Hotel & Resto: referensi yang ditunggu Dirut ternyata kenalan lamanya

**Nilai:** Rp147 jt per tahun · 35 outlet · tahap Negosiasi · pemegang deal Bagus Prakoso

**Temuan**
- Deal ini tertahan. Purchasing Manager Nirwana, Yuli Astuti, menulis (I0335, 22 Sep 2026):
  > "Pak Bagus, Direktur Utama kami minta rekomendasi dari pengguna yang mirip dengan kami sebelum tanda tangan. Kami tunda dulu sampai ada referensi."
- Sistem menyarankan **Saiyo Group (C06)** sebagai referensi. Kondisinya bagus: resto, Enterprise 30 outlet, NPS 9, health Hijau, dan hanya 1 dari 25 tiket yang masih terbuka.
- CFO sekaligus champion Saiyo, **Budi Santoso**, pernah bekerja bersama Dirut Nirwana, **Hartono Gunawan**:

| | PT Sentosa Abadi Group | Sekarang |
|---|---|---|
| Hartono Gunawan | General Manager, Jan 2015 – Nov 2019 | Direktur Utama Nirwana (sejak Jan 2020) |
| Budi Santoso | Finance Manager, Feb 2015 – Des 2019 | CFO Saiyo Group (sejak Jan 2020) |

  Mereka bekerja bersamaan hampir 5 tahun (Feb 2015 – Nov 2019).
- Budi sedang puas dengan KasirNusa. Pada 19 Agustus 2026 dia menulis ke AM-nya, Wahyu (I0300):
  > "Pak Wahyu, kami berencana membuka 10 outlet di Jakarta pada kuartal 2 2027. Kami ingin tetap pakai KasirNusa."
- Semua interaksi Bagus di Nirwana sejauh ini hanya dengan Yuli (I0284, I0314, I0335). Hartono belum pernah dihubungi langsung.
- Jalur terkuat di aplikasi: Bagus → Yuli Astuti → Hartono, skor 0,435. Yuli dan Hartono satu kantor sejak 2021. Relasi Budi–Hartono sudah berakhir 2019, jadi bobotnya lebih rendah (0,470). Budi tetap orang terbaik untuk memberi referensi, karena itulah yang ditunggu Dirut.

**Rekomendasi:** Bagus minta tolong Wahyu (AM Saiyo), lalu Wahyu minta Budi memberi referensi langsung ke Hartono. Satu pesan dari mantan rekan kerja yang juga pelanggan puas bisa membuka deal Rp147 jt yang sedang tertahan.

---

## 4. P02 Teras Kafe Group: mengulang kasus Kafe Senja

**Nilai:** Rp63 jt per tahun · 15 outlet · tahap Demo · pemegang deal Citra Ayuningtyas · pesaing KasirPro

**Temuan**
- Pada 28 Sep 2026, Citra mengirim email ke VP Sales (I0348):
  > "Pak Andi, untuk menutup Teras Kafe saya usul diskon 20% agar menyamai KasirPro. Mohon keputusan."
- Hal yang sama pernah terjadi, dengan sales yang sama, di segmen yang sama, melawan pesaing yang sama:

| | Kafe Senja (C23), 2025 | Teras Kafe (P02), 2026 |
|---|---|---|
| Sales | Citra | Citra |
| Segmen | Kafe, F&B | Kafe, F&B |
| Pesaing | KasirPro | KasirPro |
| Permintaan diskon | 20% (D-2025-02) | 20% (I0348) |
| Hasil | Ditolak karena di atas batas 15%, deal **kalah karena harga** (DL-006, Mar 2025) | Belum diputuskan |
| Jalan keluar | **Paket Starter tanpa diskon, pilot 6 outlet**, "naik paket bila puas", menang Sep 2025 (D-2025-06, DL-007) | – |

- Dari 17 keputusan diskon di log, semua 7 permintaan di atas 15% ditolak. Jadi permintaan 20% untuk Teras Kafe hampir pasti ditolak juga.
- Kafe Senja sekarang pelanggan sehat: health Hijau, NPS 8.

**Kenapa penting:** aplikasi saat ini menyarankan Kopi Lintas Nusantara sebagai referensi P02. Padahal CFO C01 sedang mengevaluasi KasirPro (temuan 2). Kafe Senja adalah referensi yang jauh lebih pas: kafe yang pernah memilih KasirNusa dibanding KasirPro.

**Rekomendasi**
1. Pakai pola yang sudah terbukti, yaitu pilot paket Starter tanpa diskon.
2. Jadikan Kafe Senja referensi.
3. Catatan: champion Kafe Senja, Dimas Arya, tidak tercatat dihubungi selama 12 bulan, jadi perlu dihubungi lagi dulu (lihat temuan 6).

---

## 5. P03 Klinik Pratama Medika: minta referensi apotek, aplikasi tidak menemukannya

**Nilai:** Rp37,8 jt per tahun · 9 klinik · tahap Discovery · pemegang deal Doni Saputra

**Temuan**
- Satu-satunya interaksi adalah meeting Discovery dengan Kepala Apotek, Ratna Dewi (I0334, 21 Sep 2026):
  > "Butuh modul apotek untuk 9 klinik. Bu Ratna minta referensi pelanggan apotek yang sudah memakai KasirNusa."
- Produknya sudah siap: FEAT-05 *Modul apotek (resep & batch obat)* sudah rilis.
- KasirNusa punya 4 pelanggan apotek:

| Pelanggan | Paket, outlet | NPS | Health | Catatan |
|---|---|---|---|---|
| C17 Apotek Bunda Sehat | Starter, 10 outlet | 10 | Hijau | Ukurannya paling mirip P03 (9 klinik) |
| C09 Apotek Medika Farma | Growth, 15 outlet | 9 | Hijau | Janji fitur loyalti untuk mereka **ditepati** (D-2024-05) |
| C03 Apotek Sehat Sentosa | Growth, 18 outlet | 8 | Kuning | – |
| C27 Apotek Kimia Sejahtera | Growth, 22 outlet | 8 | Kuning | – |

- **Celah di aplikasi:** referensi untuk P03 kosong. Industri P03 tertulis "Klinik + apotek", sedangkan pelanggan tertulis "Apotek". Fungsi kemiripan di `lib/analyze.ts` hanya mencocokkan teks persis atau kelompok F&B/ritel.
- Pengambil keputusan, Direktur Klinik Hanif Maulana, belum pernah dihubungi. Doni baru berinteraksi dengan Ratna, jadi jalan ke Hanif adalah lewat Ratna, rekan sekantornya. Di aplikasi jalurnya Doni → Ratna Dewi → Hanif, skor 0,351.

**Rekomendasi**
1. Tawarkan Apotek Bunda Sehat atau Apotek Medika Farma sebagai referensi.
2. Minta Ratna mengenalkan ke Hanif.
3. Perbaiki pencocokan industri di aplikasi sebelum demo.

---

## 6. Label champion di CRM tidak menjamin relasinya hangat

**Temuan**
- Rata-rata KasirNusa hanya berinteraksi **2,4 kali setahun** dengan setiap champion.
- 5 dari 40 champion tidak tercatat dihubungi sama sekali selama 12 bulan:

| Akun | Champion | Health | NPS | Perpanjangan | Nilai/tahun |
|---|---|---|---|---|---|
| C26 Ayam Geprek Mantul | Galih Susanto | **Kuning** | 7 | **30 Des 2026** | Rp39,9 jt |
| C08 Toko Elektronik Cahaya | Dodi Siregar | Hijau | 10 | 18 Des 2026 | Rp58,8 jt |
| C10 Bakmi Jowo Pak Gondo | Mira Susanto | Hijau | 8 | 26 Mar 2027 | Rp79,4 jt |
| C35 Frozen Food Mama | Taufik Halim | Hijau | 9 | 5 Apr 2027 | Rp87,8 jt |
| C23 Kafe Senja | Dimas Arya | Hijau | 8 | 8 Sep 2027 | Rp25,2 jt |

- Champion di CRM juga bisa basi. Rina masih tercatat sebagai champion C01 padahal sudah pindah ke prospek (temuan 1).
- Dengan pembobotan berbasis jurnal (lihat `docs/pembobotan-relasi.md`), kekuatan relasi champion rata-rata hanya **0,49**, jauh di bawah asumsi lama 0,95.

**Kenapa penting**
- Jalur "lewat champion" hanya sekuat interaksi nyatanya, bukan sekuat labelnya.
- C26 paling mendesak: health Kuning, NPS 7, perpanjangan akhir Desember, dan champion-nya tidak pernah dihubungi.

---

## 7. Celah data: prospek terbesar kedua tidak punya satu kontak pun

**Nilai:** Rp168 jt per tahun · 40 outlet · tahap Lead · pemegang deal Citra Ayuningtyas

- **PT Distribusi Sumber Rejeki (P05)** tidak punya kontak di CRM dan tidak punya interaksi tercatat, jadi tidak ada jalur yang bisa dicari. Aplikasi menyarankan riset stakeholder dan referensi Minimarket Berkah.
- **Petunjuk lemah, belum terbukti:** namanya mirip pelanggan **Swalayan Sumber Rejeki (C11)**, yang juga melayani grosir (D-2024-03: "Klien grosir, arus kas musiman"). Pemilik C11 adalah Joko Kurniawan, AM-nya Sari. Data tidak bisa membuktikan keduanya berhubungan, karena "Sumber Rejeki" nama usaha yang umum. Tapi pertanyaan ini murah untuk diajukan lewat Sari.

---

## Apa yang sudah tampil di aplikasi

Penting supaya tidak mengklaim aplikasi melakukan sesuatu yang belum dilakukannya.

| Temuan | Status di aplikasi |
|---|---|
| 1. DM P01 dan jalur hangat lewat C01 | **Tampil.** Deteksi DM dengan bukti I0343, jalur terkuat Bagus → Sari → Rina, catatan "TEMUAN KUNCI", dan sinyal lintas-track "champion C01 pindah ke P01". |
| 2. Masalah FEAT-07 di C01 | **Belum tampil.** Datanya ada di `decision_log.csv` dan `features.csv`, yang belum dimuat aplikasi. |
| 3. Budi ↔ Hartono untuk P04 | **Tampil terpisah.** Referensi Saiyo ada di kartu P04, relasi Budi–Hartono ada di tabel "Relasi Tersembunyi", tapi keduanya belum disambungkan. Jalur terkuat P04 lewat Yuli. |
| 4. Pola Kafe Senja untuk P02 | **Belum tampil.** Aplikasi menyarankan C01 sebagai referensi P02. |
| 5. Referensi apotek untuk P03 | **Belum tampil.** Referensi P03 kosong karena pencocokan industri. |
| 6. Champion jarang dihubungi | **Sebagian.** Bobot champion yang rendah terlihat di jalur, tapi statistiknya tidak ditampilkan. |
| 7. P05 tanpa kontak | **Tampil.** Catatan "Belum ada kontak terdaftar". |

Aplikasi saat ini memuat 6 dari 15 file data: `crm_accounts`, `crm_contacts`, `contact_employment_history`, `crm_deals`, `employees` dan `interactions`.

## Saran urutan presentasi

1. **Buka dengan temuan 1:** "Kalau hanya melihat jabatan, kami akan mendekati Dirut. Data interaksi menunjukkan keputusan ada di GM Operations baru, dan dia mantan Head of Operations di pelanggan kami sendiri."
2. **Lanjut ke temuan 2 (twist):** "Tapi jalur hangat itu membawa beban. Rina adalah orang yang dulu kami janjikan integrasi akuntansi, dan janji itu belum ditepati. Jadi sebelum minta referensi, perbaiki dulu hubungannya."
3. **Tutup dengan temuan 3:** "Deal Rp147 jt tertahan menunggu referensi, dan referensi terbaiknya adalah mantan rekan kerja Dirut mereka sendiri."
4. Simpan temuan 4–7 untuk pertanyaan lanjutan juri.
