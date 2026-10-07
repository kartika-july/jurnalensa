# Jurnalensa

Web pemeriksaan jurnal untuk DOI, ISSN, dan nama jurnal. Menampilkan kuartil
SJR menurut kategori dan tahun, serta catatan peringkat akreditasi nasional
dengan bukti sumber. Mendukung hingga 20 DOI per proses, perbandingan tiga
jurnal, ekspor CSV, dan ringkasan melalui dialog cetak browser.

Pencarian mencakup Indonesia dan internasional. Ada filter negara, daftar
hasil yang dapat dilanjutkan, serta identitas Crossref ketika jurnal tidak
ada dalam data awal. Identitas yang ditemukan tidak otomatis memiliki
kuartil atau akreditasi.

## Mulai di VS Code

1. Ekstrak `jurnalensa-source-v3.zip`, lalu buka folder `jurnalensa` melalui
   **File → Open Folder** di VS Code. Membuka `app/page.tsx` dengan Live Server
   tidak menjalankan aplikasi dan API-nya.
2. Pasang **Node.js 22.13 atau lebih baru**, bukan 12.13. Node.js adalah
   program yang menjalankan JavaScript dan server web lokal; VS Code adalah
   editor kodenya. Pilihan praktis: Node.js **LTS** dari
   https://nodejs.org/id/download dengan installer Windows `.msi` yang sesuai
   komputer. Instal dengan opsi standar, lalu tutup dan buka kembali VS Code.
3. Pilih **Terminal → New Terminal**. Pastikan terminal berada di folder
   `jurnalensa` yang memiliki `package.json`; buka folder proyek utuh, bukan
   menyalin isi berkas satu per satu.
4. Jalankan perintah berikut, satu per satu. Perintah ini juga dapat digunakan
   di Windows PowerShell, macOS, dan Linux.

```sh
node --version
npm --version
npx --yes pnpm@11.25.0 install --frozen-lockfile
npm run dev
```

Buka `http://localhost:5173`. Jika port sedang dipakai, hentikan proses lain
yang memakai port tersebut. Tekan **Ctrl+C** untuk menghentikan aplikasi.
`node --version` memeriksa instalasi; `npx ... install` memasang dependensi
sesuai lockfile; `npm run dev` menjalankan server pengembangan. Perintahnya
`dev`, bukan `developer`. Pemasangan dependensi dilakukan pertama kali atau
ketika paket berubah; untuk sesi berikutnya cukup `npm run dev`.

Jika Windows menyebut `node` tidak dikenali, buka kembali VS Code setelah
instalasi Node.js. Jika PowerShell memblokir `npm.ps1` atau `npx.ps1`, pilih
terminal **Command Prompt** dari menu terminal VS Code dan jalankan perintah
yang sama; tidak perlu melonggarkan kebijakan PowerShell.

Instalasi pertama membutuhkan internet; DOI, sumber SINTA langsung, dan
tahun SJR selain 2025, serta pencarian identitas tambahan Crossref, juga
membutuhkan internet saat pencarian.
Versi ini tidak memerlukan API key AI atau akun jurnal berbayar.

Untuk memeriksa kode dan membuat build:

```sh
node scripts/check-journals.mjs
node node_modules/typescript/bin/tsc --noEmit --pretty false
npm run build
```

Arsip berisi kode frontend, API backend, data awal, importer, dan lockfile.
Dependensi di `node_modules` dipasang melalui perintah di atas. Konfigurasi
lokal otomatis memakai profil `portable`; jangan menyalin `.sites-runtime`
dari lingkungan pengembangan lain.

## Bagian kode yang bisa diubah

| Berkas | Peran |
| --- | --- |
| `app/page.tsx` | Layout, pencarian, daftar DOI, perbandingan, dan ekspor |
| `app/globals.css` | Warna, ukuran, jarak, dan tampilan responsif |
| `public/assets/brand/` | Logo Jurnalensa transparan, versi web dan gambar asli |
| `public/assets/sources/` | Logo sumber dan catatan asal aset |
| `app/api/search/route.ts` | Endpoint pencarian `/api/search` |
| `app/api/coverage/route.ts` | Endpoint jumlah data `/api/coverage` |
| `lib/journal-core.ts` | Validasi DOI/ISSN, parser, dan pencocokan |
| `lib/journal-service.ts` | Akses Crossref, SCImago, dan SINTA |
| `lib/data/sjr-2025.txt` | Snapshot SCImago dalam gzip/base64; bukan teks untuk diedit manual |
| `lib/data/sinta.json` | Catatan akreditasi nasional beserta bukti sumber |
| `scripts/import-accreditation.py` | Importer dokumen SK akreditasi |

## Menyimpan kode ke GitHub

Setelah Git terpasang, buat repository kosong bernama `jurnalensa` di GitHub
tanpa README otomatis. Jalankan di terminal folder proyek:

```sh
git init
git add .
git commit -m "Initial Jurnalensa source"
git branch -M main
git remote add origin https://github.com/USERNAME/jurnalensa.git
git push -u origin main
```

Ganti `USERNAME` dengan akun GitHub Anda. Git mungkin meminta pengaturan
nama/email penulis commit dan autentikasi akun. Alternatifnya, gunakan panel
**Source Control** di VS Code untuk melakukan commit dan publikasi repository.
`.gitignore` mengabaikan dependensi, hasil build, dan berkas `.env`.

Link repository membagikan kode. Link website membutuhkan hosting yang
menjalankan API backend. **GitHub Pages saja tidak menjalankan API proyek
ini** karena menyediakan hosting statis. Jangan mengubah aplikasi menjadi
export statis tanpa memindahkan API pencarian ke backend lain.
Penjelasan GitHub: https://docs.github.com/en/pages/getting-started-with-github-pages/what-is-github-pages

Kode menggunakan Vinext/Vite dan runtime Cloudflare Worker. Konfigurasi
`.openai/hosting.json` di paket unduhan tidak membawa identitas Site pemilik.
Menjalankan proyek lokal tidak memerlukan akses ke Site tersebut. Untuk
publikasi baru, pilih hosting yang sesuai dengan Worker dan pertahankan API;
mengunggah folder ke GitHub belum menerbitkan website.

## Apakah ini memakai AI?

Versi ini tidak mengirim pencarian ke model AI. Identitas DOI berasal dari
Crossref, sementara peringkat dicocokkan dengan data sumber melalui ISSN
dan pencarian nama. Dukungan WebMCP memberi agen browser cara menggunakan
pencarian; dukungan tersebut bukan mesin AI di dalam aplikasi.

Jika asisten AI ditambahkan nanti, perannya dapat menjelaskan hasil dan
membantu navigasi. Angka kuartil maupun peringkat SINTA tetap harus berasal
dari sumber yang dapat ditelusuri. Hasil yang belum tersedia tidak boleh
diisi dengan perkiraan model.

## Identitas dan kontak

Pengembang: **A.P.A Projek**. Kontak:
[kartika.230852044@student.unud.ac.id](mailto:kartika.230852044@student.unud.ac.id).
Tautan kontak membuka aplikasi email pengguna; website tidak mengirim email
secara otomatis.

Lambang Jurnalensa menggabungkan buku terbuka berwarna hijau tua dan satu
bintang emas. Buku mewakili jurnal dan pengetahuan; bintang mengacu pada
makna Kartika yang diberikan oleh pengembang. Lambang dibuat dengan
ImageGen dan tersedia sebagai PNG transparan, termasuk gambar asli.
Lambang ini belum merupakan berkas vektor. Favicon dan ikon Apple memakai
lambang yang sama.

Logo SCImago dan SINTA dipasang sebagai gambar lokal, sehingga ikut dalam
paket kode. Crossref dipanggil dari CDN resminya sesuai panduan merek,
menggunakan versi **Metadata from Crossref**. Logo tersebut menyebut sumber,
bukan menyatakan kerja sama atau dukungan resmi terhadap Jurnalensa.
Asal aset, tautan sumber, dan prompt lambang tercatat di
`public/assets/sources/README.md` dan `public/assets/brand/README.md`.

## Data dan keterbatasan

- SCImago 2025: 30.412 jurnal dari 122 negara (314 bernegara Indonesia),
  diambil dari ekspor publik resmi pada 7 Oktober
  2026. Jenis selain jurnal dikeluarkan. Seluruh kategori kuartil dipertahankan.
  Sumber: https://www.scimagojr.com/journalrank.php?year=2025&out=xls
- Tahun SJR 1999–2024 diminta dari ekspor publik saat pencarian. Kegagalan
  akses menghasilkan peringkat yang tidak tersedia; tahun lain tidak dipakai
  sebagai pengganti. Satu ekspor tambahan disimpan sementara dalam memori.
- Akreditasi nasional: 2.679 catatan dari SK 355/DST/D.D1/HM.01.01/2026,
  ditetapkan 24 Juli 2026 (Periode 3 Tahun 2025), ditambah tiga catatan profil
  resmi SINTA yang tersedia melalui indeks penelusuran pada 7 Oktober 2026.
  Cakupan ini bukan seluruh jurnal SINTA dan bukan konfirmasi status terkini.
  Total 2.682 catatan berasal dari 1.439 nama penerbit, mencakup S1–S6,
  politeknik, STKIP, universitas, dan penerbit lainnya.
  Sumber dokumen: https://ylii.or.id/dokumen_download/SK_Akreditasi_Jurnal_862_DST_D.D1_HM.01.01_2026.pdf
  Profil tambahan: https://sinta.kemdiktisaintek.go.id/journals/profile/662,
  https://sinta.kemdiktisaintek.go.id/journals/profile/671,
  https://sinta.kemdiktisaintek.go.id/journals/profile/32
- Delapan belas baris dokumen dengan ISSN tidak valid atau periode yang belum
  dapat diekstrak secara lengkap dikeluarkan; tidak dikoreksi melalui dugaan.
- Pemeriksaan langsung SINTA dicoba untuk jurnal nasional/negara yang belum
  diketahui, dengan timeout dan jeda ketika sumber gagal. Saat audit
  7 Oktober 2026, akses langsung membalas HTTP 403. Jurnal yang diketahui
  bernegara di luar Indonesia tidak mengirim permintaan SINTA.
- Crossref mengambil metadata DOI secara langsung. DOI yang tidak terdaftar
  di Crossref memerlukan ISSN atau nama jurnal. Judul paper tidak dipakai untuk
  menebak jurnal, dan ISSN menjadi dasar penggabungan sumber.
- Jika nama/ISSN tidak ada dalam data awal, API jurnal Crossref mengambil
  maksimal 20 kandidat identitas. Identitas dapat tampil tanpa peringkat;
  Crossref tidak menyediakan SJR/SINTA. Alias judul digabung hanya melalui
  ISSN. Judul yang sama dengan ISSN berbeda tidak mewarisi peringkat.
- Hasil data awal ditampilkan 12 per halaman dan dapat dilanjutkan. Filter
  negara menggunakan negara pada sumber; metadata yang belum memiliki negara
  ditampilkan dengan pilihan **Semua negara**. Lokasi penerbit tidak ditebak.
- Kuartil SJR bukan kuartil CiteScore/JCR. Data SCImago bukan konfirmasi status
  Scopus terkini maupun pengindeksan artikel tertentu.
- Rentang volume/nomor akreditasi ditampilkan sebagai bukti SK; aplikasi tidak
  menyimpulkan peringkat historis suatu artikel secara otomatis.

## Memperbarui sumber

Jaga atribusi, asal dokumen, tanggal pengambilan, dan pemeriksaan ISSN. Untuk
SK yang memiliki tabel lima kolom dan susunan serupa, gunakan importer
`scripts/import-accreditation.py`; periksa penetapan dan format dokumen,
dan masukkan identitas keputusan secara eksplisit:

```sh
python -m pip install pdfplumber
python scripts/import-accreditation.py dokumen.pdf https://SUMBER/dokumen.pdf hasil.json --decision-number "NOMOR SK YANG BENAR" --decision-date YYYY-MM-DD
```

Importer tidak memberi nomor SK/tanggal bawaan untuk dokumen baru. Periksa
hasil JSON dan laporan penolakan, lalu gabungkan melalui ISSN sambil
mempertahankan bukti tiap keputusan. Jangan mengganti seluruh snapshot lama
dengan satu SK baru karena jurnal lain akan hilang. Periksa secara
visual sampel awal, batas halaman, peralihan peringkat, dan akhir dokumen.
Jangan menganggap dokumen hasil akreditasi lama sebagai status terkini.

Hak penggunaan ulang untuk perluasan distribusi komersial/bulk perlu
ditetapkan bersama pemilik sumber; ketersediaan ekspor tidak menetapkan
lisensi bebas untuk seluruh basis data. Situs awal disebarkan secara privat.

## Validasi

`node scripts/check-journals.mjs` memeriksa parser CSV, kategori, DOI, digit
kontrol ISSN, pencocokan identitas, kasus sumber gagal, dan larangan memakai
kuartil tahun lain sebagai pengganti. Pemeriksaan tipe: `node
node_modules/typescript/bin/tsc --noEmit`. Build lokal: `npm run build`.
Pemeriksaan juga mencakup negara, kelanjutan hasil, identitas Crossref tanpa
peringkat, alias ISSN, konflik nama/ISSN, dan judul non-Latin. Ini tidak
merupakan jaminan akses ke sumber eksternal di semua jaringan.

## Skenario uji sebelum publikasi

| Input / tindakan | Hasil yang perlu diperiksa |
| --- | --- |
| `PLOS ONE`, SJR 2025 | Q1, United States; SINTA di luar cakupan nasional |
| `Scientific Reports`, SJR 2025 | Q1, United Kingdom; sumber SCImago tersedia |
| `2303-288X` | Jurnal Pendidikan Indonesia; catatan profil S2 dengan tanggal sumber |
| `2721-6179` | Lontara; S2 dari SK, termasuk masa berlaku |
| `2987-2421` | Bima Journal of Elementary Education; S3 dari SK |
| `Education` dan tampilkan hasil berikutnya | Lebih dari 12 kecocokan, halaman dilanjutkan tanpa mengulang hasil |
| `JPI (Jurnal Pendidikan Indonesia)` | Identitas Crossref dicocokkan ke catatan nasional melalui ISSN |
| Jurnal di luar snapshot | Identitas boleh muncul; peringkat yang belum diketahui tetap kosong |
| `10.1038/nphys1170` | Nature Physics; tahun artikel dan tahun SJR dibedakan |
| `1411-9421` | ISSN salah ditolak sebelum permintaan sumber |
| Tahun SJR yang sumbernya gagal | Identitas tetap tampil bila tersedia; kuartil tahun lain tidak dipakai |

Uji juga kontrol perbandingan, unduh CSV, cetak, tampilan ponsel, dan keyboard
di browser lokal. Versi ini siap diuji; bukan klaim seluruh jurnal dunia
atau seluruh direktori SINTA telah tercakup. Prioritas perluasan adalah
akses resmi data SINTA, riwayat keputusan yang terstruktur, dan mekanisme
pembaruan snapshot dengan pemeriksaan identitas.

Data sementara tidak disimpan sebagai riwayat pengguna. Perbandingan dan
hasil pemeriksaan berada di memori halaman; akan hilang saat halaman dimuat
ulang. Browser yang mendukung WebMCP dapat mengakses alat `search_journal`
melalui alur pencarian yang sama dengan antarmuka.
