# Pembobotan Relasi Berbasis Jurnal

Dokumen ini menjelaskan cara Relationship Path Finder menghitung **bobot setiap relasi** (edge) di context graph. Bobot ini yang menentukan jalur terkuat ke pengambil keputusan.

## Ringkasan

- **Sumber bobot:** model kekuatan relasi (*tie strength*) dari **Gilbert & Karahalios (2009)**. Rumus dan bobot dimensinya diambil dari jurnal, sedangkan angka masukannya dihitung dari data CRM. Tidak ada angka yang diisi manual.
- **Bobot dihitung per pasangan, bukan per jenis relasi.** Dua champion bisa punya bobot berbeda, tergantung seberapa sering dan seberapa baru KasirNusa berhubungan dengan mereka.
- **Skor jalur tidak berubah:** tetap hasil perkalian bobot di sepanjang jalur, dan jalur terkuat adalah yang perkaliannya paling besar (Richardson dkk., 2003).
- **Jalur hanya lewat orang.** Akun (perusahaan) hanya boleh jadi titik awal atau akhir jalur, tidak boleh jadi perantara. Dengan begitu setiap jalur menyebut siapa yang bisa dimintai tolong. Lihat bagian 5.
- **Kode:** `lib/graph.ts`. Bobot dihitung otomatis setiap kali graph dibangun saat server mulai.

## 1. Kenapa bobot lama diganti

Bobot lama (`CHAMPION_DARI` 0,95, `BEKERJA_DI` 0,9, `SALING_KENAL` 0,7, dst.) adalah asumsi tanpa sumber. Kalibrasi dari data hasil penjualan juga tidak memungkinkan, karena `crm_deals.csv` hanya berisi 22 deal dan tidak satu pun mencatat jalur relasi apa yang dipakai.

Tidak ada jurnal yang menyediakan angka siap pakai seperti "champion = 0,95". Yang tersedia adalah **rumus dengan bobot yang sudah diukur**. Karena itu rumusnya diambil dari jurnal dan dijalankan pada data yang ada.

## 2. Rumus

Gilbert & Karahalios (2009) mengukur kekuatan relasi pada skala 0 sampai 1 dari 7 dimensi. Bobot tiap dimensi berasal dari model mereka (Figure 3, model "How strong?", akurasi 87,2% dalam membedakan relasi kuat dan lemah). Lima dimensi bisa diukur dari data kita:

| Dimensi | Bobot jurnal | Arti | Dipakai? |
|---|---|---|---|
| Intimacy | 32,8 | Kedekatan; prediktor terkuatnya "berapa hari sejak komunikasi terakhir" (β = −0,76) | Ya |
| Intensity | 19,7 | Banyaknya komunikasi atau waktu yang dihabiskan bersama | Ya |
| Duration | 16,5 | Lama hubungan, "berapa hari sejak komunikasi pertama" | Ya |
| Social distance | 13,8 | Beda pendidikan, pekerjaan, pandangan politik | Tidak, datanya tidak ada |
| Services | 7,9 | Pertukaran jasa atau bantuan timbal balik | Ya |
| Emotional support | 4,8 | Kata-kata emosi positif dalam pesan | Tidak, datanya tidak ada |
| Structural | 4,5 | Jumlah kenalan bersama | Ya |

Bobot satu edge dihitung sebagai rata-rata berbobot dari dimensi yang **punya data untuk edge itu**:

```
bobot(edge) = Σ (bobot_dimensi × nilai_dimensi) / Σ bobot_dimensi
              (kedua Σ hanya atas dimensi yang tersedia untuk edge itu)
```

Nilai tiap dimensi (0 sampai 1) didapat dengan tiga langkah:

1. **Transformasi log.** Setiap indikator diubah menjadi `ln(1 + x)`, mengikuti Gilbert & Karahalios yang melog-transformasi semua variabelnya.
2. **Normalisasi min-max** ke rentang 0–1 (OECD/JRC, 2008). Indikator bersatuan sama dinormalisasi bersama lintas jenis relasi, supaya misalnya "hari sejak kontak terakhir" pada relasi interaksi dan relasi riwayat kerja berada di skala yang sama.
3. **Arah.** Untuk Intimacy, makin banyak hari sejak kontak terakhir, makin lemah relasinya, jadi nilainya dibalik: `1 − nilai_normalisasi`. Dimensi lain berarah positif. Arah ini mengikuti tanda koefisien di jurnal.

Dimensi tanpa variasi sama sekali di data tidak bisa membedakan apa pun, jadi ikut tidak dipakai.

**Tanggal acuan:** semua "berapa hari sejak" dihitung terhadap tanggal terakhir yang tercatat di dataset, yaitu **2026-09-30**, supaya hasilnya sama setiap kali dijalankan. Log interaksi mencakup **2025-10-03 s.d. 2026-09-30** (350 email/meeting dari 124 pasangan).

## 3. Indikator untuk setiap jenis relasi

| Relasi | Intimacy (hari sejak kontak terakhir) | Intensity | Duration (hari sejak kontak pertama) | Services | Structural |
|---|---|---|---|---|---|
| `BEKERJA_DI` (kontak ↔ akun tempat kerja sekarang) | 0, karena masih bekerja | Lama bekerja (hari) | Hari sejak mulai bekerja | – | – |
| `PERNAH_BEKERJA_DI` (kontak ↔ akun tempat kerja dulu) | Hari sejak keluar | Lama bekerja (hari) | Hari sejak mulai bekerja | – | – |
| `SALING_KENAL` (kontak ↔ kontak, pernah atau masih sekantor) | Hari sejak masa sekantor berakhir (0 kalau masih sekantor) | Total hari bekerja bersamaan | Hari sejak mulai bekerja bersamaan | – | Jumlah kenalan bersama |
| `BERINTERAKSI` (orang ↔ orang di email/meeting) | Hari sejak interaksi terakhir | Jumlah interaksi | Hari sejak interaksi pertama | 1 kalau interaksi karyawan–kontak terjadi di akun pelanggan, 0 kalau di prospek; karyawan–karyawan = 1 | Jumlah kenalan bersama |
| `CHAMPION_DARI` (champion ↔ akun pelanggan) | Hari sejak interaksi terakhir KasirNusa dengan champion | Jumlah interaksi KasirNusa dengan champion | Hari sejak interaksi pertama | 1, karena champion memberi advokasi | – |
| `ACCOUNT_OWNER` (karyawan ↔ akun yang dipegang) | Hari sejak interaksi terakhir pemegang akun di akun itu | Jumlah interaksinya di akun itu | Hari sejak interaksi atau deal pertama | 1 kalau akun pelanggan, 0 kalau prospek | Jumlah kontak di akun itu yang pernah diajak berinteraksi |
| `MENANGANI_DEAL` (pemegang deal ↔ akun) | Sama seperti ACCOUNT_OWNER | Sama | Hari sejak interaksi atau deal pertama | 1 kalau ada deal yang menang | Sama |
| `REKAN_KERJA` (karyawan ↔ karyawan) | 0, karena masih satu kantor | – (komunikasi internal tidak tercatat di CRM) | – (tidak ada tanggal masuk kerja) | 1, karena saling bantu dalam tim | Jumlah kenalan bersama |

Catatan:

- **Tanpa interaksi tercatat:** jumlah interaksi = 0, duration = 0, dan "hari sejak kontak terakhir" diisi 363, yaitu lebih lama dari seluruh periode log.
- **Dasar pemetaan indikator:**
  - "Hari sejak komunikasi terakhir/pertama" dan jumlah pesan adalah variabel di Gilbert & Karahalios (2009). Kedekatan (Intimacy) sebagai indikator terkuat sejalan dengan temuan Marsden & Campbell (1984).
  - "Lama waktu bersama" adalah salah satu unsur kekuatan relasi menurut Granovetter (1973).
  - Volume interaksi sebagai ukuran kekuatan relasi juga dipakai Onnela dkk. (2007).
  - Relasi yang sudah lama tidak aktif makin melemah (Burt, 2000).
  - "Reciprocal services" adalah unsur kekuatan relasi menurut Granovetter (1973) dan dimensi Services di Gilbert & Karahalios.
- **Satu edge per pasangan.** Kode lama membuat edge baru untuk setiap baris data, sehingga terjadi duplikasi: `BEKERJA_DI` 320 edge untuk 160 pasangan, `BERINTERAKSI` 344 edge untuk 124 pasangan. Sekarang semua bukti untuk satu pasangan digabung jadi satu edge. Ini sekaligus memperbaiki bug lama: bobot "kontak di prospek = 0,5" sebelumnya tidak pernah terpakai karena tertimpa edge kedua bernilai 0,85 dari riwayat kerja.

## 4. Contoh perhitungan

Rina Hapsari ↔ Kopi Lintas Nusantara (`PERNAH_BEKERJA_DI`). Rina bekerja di sana 2021-03-01 s.d. 2026-08-15.

Rentang normalisasi di dataset ini (dipakai bersama oleh semua relasi):

| Satuan | Nilai mentah (min–maks) | ln(1+x) (min–maks) |
|---|---|---|
| Hari sejak kontak terakhir | 0 – 4.840 | 0,0000 – 8,4849 |
| Hari bersama (lama bekerja / sekantor) | 29 – 4.655 | 3,4012 – 8,4459 |
| Hari sejak kontak pertama | 0 – 5.386 | 0,0000 – 8,5917 |
| Jumlah interaksi | 0 – 20 | 0,0000 – 3,0445 |
| Kenalan bersama | 0 – 8 | 0,0000 – 2,1972 |
| Kontak di akun | 0 – 5 | 0,0000 – 1,7918 |

| Dimensi | Indikator | ln(1+x) | Ternormalisasi | Nilai dimensi | × bobot |
|---|---|---|---|---|---|
| Intimacy | 46 hari sejak keluar | 3,8501 | 3,8501 / 8,4849 = 0,4538 | 1 − 0,4538 = 0,5462 | × 32,8 = 17,916 |
| Intensity | 1.993 hari bekerja | 7,5979 | (7,5979 − 3,4012) / (8,4459 − 3,4012) = 0,8319 | 0,8319 | × 19,7 = 16,388 |
| Duration | 2.039 hari sejak mulai | 7,6207 | 7,6207 / 8,5917 = 0,8870 | 0,8870 | × 16,5 = 14,635 |

```
bobot = (17,916 + 16,388 + 14,635) / (32,8 + 19,7 + 16,5) = 48,940 / 69,0 = 0,709
```

Edge ini dipakai untuk mendeteksi relasi tersembunyi dan memilih referensi, karena menunjukkan Rina pernah bekerja di pelanggan kita. Untuk jalur, akun tidak boleh jadi perantara (bagian 5), jadi jalur terkuat ke Rina lewat orang:

```
Bagus → Sari (REKAN_KERJA 1,000) → Rina (BERINTERAKSI 0,462)
skor = 1,000 × 0,462 = 0,462
```

Sari pernah bertemu Rina langsung di Quarterly Business Review Kopi Lintas Nusantara (I0107, 9 Jan 2026).

## 5. Aturan jalur: hanya lewat orang

Graph menyimpan dua jenis node: orang (karyawan dan kontak) dan akun (perusahaan). Saat mencari jalur, **akun hanya boleh menjadi titik awal atau akhir, tidak boleh menjadi perantara**.

Alasannya:

1. **Kekuatan relasi dan perambatan trust didefinisikan antar-orang.** Ini berlaku untuk Gilbert & Karahalios (2009) maupun Richardson dkk. (2003). Perusahaan tidak bisa memperkenalkan seseorang; orang di dalamnya yang bisa.
2. **Hubungan "satu perusahaan" sudah diwakili sebagai relasi antar-orang** lewat `SALING_KENAL`. Ini adalah proyeksi jaringan keanggotaan orang–organisasi menjadi jaringan orang–orang, seperti dijelaskan Breiger (1974). Kalau akun juga boleh dilewati, hubungan yang sama terhitung dua kali.
3. **Tanpa aturan ini, jalur lewat akun tampak terlalu kuat dan menyembunyikan perantaranya.** Jalur seperti "sales → akun prospek → Dirut" menggabungkan semua interaksi dengan perusahaan itu, padahal tidak jelas siapa yang bisa memperkenalkan. Contohnya P04 sempat tampil "Bagus → Nirwana → Hartono" (0,496), padahal satu-satunya orang Nirwana yang pernah diajak bicara Bagus adalah Yuli Astuti.

Dampaknya pada dataset:

- Ke-160 kontak tetap terjangkau dari karyawan KasirNusa.
- Rata-rata skor jalur terbaik ke setiap kontak turun dari 0,631 menjadi 0,547. Rata-rata panjang jalur turun dari 2,95 menjadi 2,49 hop.
- Edge yang terhubung ke akun (`ACCOUNT_OWNER`, `MENANGANI_DEAL`, `BEKERJA_DI`, `PERNAH_BEKERJA_DI`, `CHAMPION_DARI`) tetap dihitung bobotnya dan tampil di Graph Explorer. Edge ini juga tetap dipakai untuk relasi tersembunyi, referensi pelanggan, dan query bebas yang berawal atau berakhir di akun.
- Di tampilan jalur, relasi ke akun tetap terlihat sebagai konteks "via akun" di setiap langkah antar-orang. Contohnya langkah Sari → Rina di P01: "via Kopi Lintas Nusantara: Sari Puspita ACCOUNT_OWNER, MENANGANI_DEAL → Rina Hapsari CHAMPION_DARI, PERNAH_BEKERJA_DI". Konteks ini hanya tampilan, jadi jalur dan skornya tidak berubah.
- Teks bukti di tampilan jalur tidak memuat ID (misalnya "Meeting 'Quarterly business review' (2026-01-09)"). Bukti lengkap dengan ID interaksi tetap dipakai sebagai konteks Magic Recommendation.

## 6. Hasil pada dataset

### Bobot per jenis relasi

| Relasi | Bobot lama | Jumlah edge (lama → baru) | Min | Median | Rata-rata | Maks |
|---|---|---|---|---|---|---|
| REKAN_KERJA | 0,9 | 45 → 45 | 1,000 | 1,000 | 1,000 | 1,000 |
| BEKERJA_DI | 0,9 / 0,85 / 0,5 | 320 → 160 | 0,570 | 0,937 | 0,926 | 0,996 |
| SALING_KENAL | 0,7 | 323 → 320 | 0,283 | 0,875 | 0,761 | 0,967 |
| PERNAH_BEKERJA_DI | 0,6 | 2 → 2 | 0,634 | 0,671 | 0,671 | 0,709 |
| ACCOUNT_OWNER | 0,8 / 0,35 | 45 → 45 | 0,161 | 0,658 | 0,659 | 0,884 |
| MENANGANI_DEAL | 0,35 | 22 → 21 | 0,161 | 0,645 | 0,618 | 0,851 |
| BERINTERAKSI | 0,55 | 344 → 124 | 0,403 | 0,516 | 0,534 | 0,816 |
| CHAMPION_DARI | 0,95 | 40 → 40 | 0,233 | 0,490 | 0,491 | 0,771 |

Temuan yang perlu diketahui:

- **Champion tidak lagi jadi relasi terkuat.** Menurut log, KasirNusa rata-rata hanya berinteraksi 2,4 kali setahun dengan setiap champion, dan 5 dari 40 champion tidak punya interaksi tercatat sama sekali. Model menilai relasi seperti itu lemah, meskipun label di CRM-nya "champion".
- **REKAN_KERJA bernilai 1,000.** Hanya tiga dimensi yang bisa diukur (masih satu kantor, saling bantu, kenalan bersama), dan ketiganya maksimal. Akibatnya meminta tolong rekan satu tim praktis tidak mengurangi skor jalur.
- **BEKERJA_DI tinggi untuk karyawan lama, rendah untuk karyawan baru.** Contohnya Rina di Grup Ritel Mandala hanya 0,570, karena baru bekerja 29 hari.

### Jalur terkuat per prospek

Tiga tahap: bobot asumsi lama; bobot jurnal ketika akun masih boleh jadi perantara; dan kondisi sekarang (bobot jurnal, jalur hanya lewat orang).

| Prospek | Decision maker | Bobot lama | Bobot jurnal, lewat akun | **Sekarang** |
|---|---|---|---|---|
| P01 Grup Ritel Mandala | Rina Hapsari (GM Operations) | Bagus → Sari → Kopi Lintas Nusantara → Rina (0,684) | Bagus → Sari → Kopi Lintas Nusantara → Rina (0,571) | **Bagus → Sari → Rina (0,462)** |
| P02 Teras Kafe Group | Teddy Kurniawan (Pemilik) | Citra → Teddy (0,550) | Citra → Teras Kafe Group → Teddy (0,570) | **Citra → Teddy (0,456)** |
| P03 Klinik Pratama Medika | Hanif Maulana (Direktur Klinik) | Doni → Ratna Dewi → Klinik → Hanif (0,397)¹ | Doni → Klinik Pratama Medika → Hanif (0,419) | **Doni → Ratna Dewi → Hanif (0,351)** |
| P04 Nirwana Hotel & Resto | Hartono Gunawan (Direktur Utama) | Bagus → Wahyu → Saiyo Group → Budi Santoso → Hartono (0,479) | Bagus → Nirwana Hotel & Resto → Hartono (0,496) | **Bagus → Yuli Astuti → Hartono (0,435)** |
| P05 PT Distribusi Sumber Rejeki | – | Tidak ada kontak terdaftar | Tidak ada kontak terdaftar | Tidak ada kontak terdaftar |

¹ Jalur lama P03 memakai edge 0,85 dari bug edge dobel.

- **Setiap jalur sekarang menyebut orang yang bisa dimintai tolong:**
  - P01: lewat Sari, yang pernah bertemu Rina di QBR Kopi Lintas Nusantara.
  - P03: lewat Ratna, rekan sekantor Hanif sejak 2021.
  - P04: lewat Yuli, rekan sekantor Hartono sejak 2021.
  - P02: Citra sudah berhubungan langsung dengan Teddy.
- **P01 tetap jalur hangat.** Sari kenal Rina dari masa Rina di Kopi Lintas Nusantara. Relasi `PERNAH_BEKERJA_DI` Rina dengan pelanggan itu tetap terdeteksi sebagai relasi tersembunyi dan dipakai untuk memilih referensi.
- **P04 tidak lagi lewat Saiyo.** Hubungan Budi–Hartono berakhir 2019, jadi bobotnya (0,470) lebih rendah daripada jalur lewat Yuli yang masih aktif. Meski begitu, Budi tetap kandidat terbaik untuk memberi referensi yang ditunggu Dirut Nirwana (lihat `docs/temuan-menarik.md`).
- **Referensi pelanggan dan deteksi decision maker tidak berubah**, karena keduanya tidak memakai bobot.

## 7. Keterbatasan

1. **Bobot dimensi berasal dari data Facebook.** Penulisnya sendiri menyebut koefisien variabelnya mungkin tidak berlaku di luar Facebook, "but the dimension weights may". Itulah alasan yang dipakai di sini hanya porsi dimensinya, bukan koefisiennya.
2. **Dua dimensi tidak dipakai.** Social distance (13,8) dan emotional support (4,8) tidak punya data, jadi bobot dinormalisasi ulang atas dimensi yang tersedia.
3. **Penyederhanaan model.** Model asli memakai suku interaksi antar-dimensi dan pengaruh kenalan bersama. Di sini porsi dimensinya dipakai sebagai bobot rata-rata linear.
4. **Log interaksi hanya 12 bulan**, sedangkan riwayat kerja mencakup belasan tahun. Akibatnya relasi berbasis interaksi selalu tampak lebih "baru" pada dimensi Duration dibanding relasi berbasis riwayat kerja.
5. **Services bernilai biner** (0 atau 1), ditentukan dari definisinya: akun pelanggan, deal menang, atau status champion.
6. **Bobot berubah kalau data berubah.** Tanggal acuan dan rentang normalisasi selalu dihitung ulang dari data yang dimuat.
7. **Jalur hanya bisa lewat relasi yang tercatat.** Kalau KasirNusa belum pernah berinteraksi dengan siapa pun di sebuah perusahaan, jalur ke sana hanya bisa lewat riwayat kerja (`SALING_KENAL`). Di dataset ini semua 160 kontak masih terjangkau.

## 8. Letak di kode

Semua ada di `lib/graph.ts`:

| Bagian | Fungsi |
|---|---|
| `BOBOT_DIMENSI` | Bobot dimensi dari Gilbert & Karahalios (2009) |
| `tanggalAcuan()` | Tanggal terakhir di dataset, acuan semua perhitungan hari |
| `hitungBobot()` | Transformasi log, normalisasi min-max, dan rata-rata berbobot |
| `relasiKeanggotaan()` | Indikator `BEKERJA_DI` dan `PERNAH_BEKERJA_DI` |
| `relasiSalingKenal()` | Indikator `SALING_KENAL` |
| `relasiDariInteraksi()` | Indikator `BERINTERAKSI`, `ACCOUNT_OWNER`, `MENANGANI_DEAL`, `CHAMPION_DARI`, `REKAN_KERJA` |
| `isiKenalanBersama()` | Dimensi Structural (jumlah kenalan bersama) |
| `bisaDilewati()` | Aturan jalur: akun hanya boleh di ujung jalur, tidak jadi perantara |
| `konteksAkun()` | Akun yang menghubungkan dua orang di satu langkah jalur, untuk ditampilkan (mis. `CHAMPION_DARI`) |
| `keteranganInteraksi()` | Teks bukti interaksi tanpa ID untuk UI; `bukti` dengan ID tetap untuk konteks AI |

Kalau nanti CRM mulai mencatat jalur yang dipakai untuk setiap deal, bobot dimensi ini bisa dikalibrasi ulang dari data sendiri.

## Daftar pustaka

- Breiger, R. L. (1974). The duality of persons and groups. *Social Forces, 53*(2), 181–190. https://doi.org/10.1093/sf/53.2.181
- Burt, R. S. (2000). Decay functions. *Social Networks, 22*(1), 1–28.
- Gilbert, E., & Karahalios, K. (2009). Predicting tie strength with social media. *Proceedings of CHI 2009*, 211–220. https://doi.org/10.1145/1518701.1518736
- Granovetter, M. S. (1973). The strength of weak ties. *American Journal of Sociology, 78*(6), 1360–1380.
- Marsden, P. V., & Campbell, K. E. (1984). Measuring tie strength. *Social Forces, 63*(2), 482–501.
- Nardo, M., Saisana, M., Saltelli, A., Tarantola, S., Hoffman, A., & Giovannini, E. (2008). *Handbook on Constructing Composite Indicators: Methodology and User Guide*. OECD Publishing.
- Onnela, J.-P., Saramäki, J., Hyvönen, J., Szabó, G., Lazer, D., Kaski, K., Kertész, J., & Barabási, A.-L. (2007). Structure and tie strengths in mobile communication networks. *PNAS, 104*(18), 7332–7336.
- Richardson, M., Agrawal, R., & Domingos, P. (2003). Trust management for the semantic web. *The Semantic Web – ISWC 2003*, 351–368. Springer.
