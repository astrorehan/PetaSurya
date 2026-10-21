# Panduan kontribusi

PetaSurya adalah peta potensi PLTS atap tingkat bangunan untuk Indonesia. Pemilik rumah dan UMKM mendapat angka balik modal yang jujur; perencana kota mendapat potensi wilayah dalam MWp dan tCO₂e.

## Struktur repo

| Jalur | Isi |
| --- | --- |
| `apps/web` | Next.js (App Router), satu-satunya antarmuka. Peta memakai MapLibre GL. |
| `services/engine` | FastAPI, Python 3.12. Satu service: geo, vision, physics, economics, carbon, aggregate, narrate, telemetry. |
| `packages/contracts` | Skema zod — sumber kebenaran tipe. Di-generate ke pydantic untuk engine. |
| `packages/ui` | Token desain, format angka, primitif bersama. |
| `data/fixtures` | Bangunan uji nyata beserta sumbernya. |
| `data/sources/sumber.yaml` | Setiap angka eksternal: nilai, satuan, penerbit, URL, tanggal diambil. |

## Menjalankan

Halaman `/` memperkenalkan PetaSurya dengan karakter Surya dan contoh analisis
atap; halaman ini statis dan berada di grup rute `app/(merek)`. Halaman produk
berada di `app/(produk)` dan berbagi kerangka header/footer (`KerangkaProduk`),
termasuk halaman galat dan tidak ditemukan. Ruang kerja peta berada di `/peta`;
pencarian lama melalui `/?q=…` diteruskan ke sana oleh `next.config.ts`. Seluruh produk memakai grafit dan amber dengan tema gelap
sebagai awal. Tema terang memakai netral hangat; pilihan pengguna tersimpan dan
berlaku juga di `/`. Warna halaman pengenalan memakai token semantik produk
(`--paper`, `--surface`, `--ink`, `--pri`); efek khasnya memakai `--brand-*`
yang mempunyai nilai per tema. Aset karakter tersimpan di `apps/web/public/brand/`.
Karakter ditayangkan sebagai WebP dengan alpha yang sudah dikompresi, tanpa
konversi gambar saat permintaan. Badan dan kedua mata Surya adalah lapisan
terpisah; mata melirik ke arah penunjuk dengan pegas teredam yang terasa berat, lalu kembali
menatap depan saat penunjuk keluar, dijeda, atau reduced motion aktif. Pada
layar sentuh, mata melirik ke titik sentuh. Judul, orbit cahaya dan kontur contoh mempunyai
gerak presentasi. Tombol jeda menghentikan gerak; reduced motion menampilkan
seluruh isi langsung. Orbit berhenti saat panggung keluar viewport atau tab
tersembunyi. Angka tampil sebagai nilai akhir, tanpa hitungan naik.
Navigasi bersama merapat saat halaman digulir dan membuka saat hover atau fokus.
Pada layar sentuh, tombol pembuka menyediakan menu. Pencarian yang sedang fokus
tetap terbuka; Escape dan klik di luar menutup menu. Gerak mengikuti reduced motion.
Navigasi utama selalu tepat di tengah header, dengan atau tanpa kolom pencarian.
Perpindahan halaman memakai View Transitions API (`TransisiHalaman`,
`app/transisi.css`): isi lama memudar lebih dulu, isi baru naik searah alur dan
turun saat kembali ke tahap sebelumnya, sedangkan header tetap di tempat.
Peramban tanpa API ini dan reduced motion berpindah halaman seperti biasa.

Pada ponsel, `/peta` menyediakan pilihan Peta dan Daftar. Pencarian langsung
membuka daftar agar hasilnya terlihat. Nama, ID, dan jenis bangunan seperti
rumah, toko, atau kampus dapat digabung dalam satu kueri; setiap kata harus cocok.
Filter Hasil tersimpan membatasi hasil pada analisis yang sudah tersedia.
Tombol `/` memfokuskan kolom pencarian selama pengguna tidak sedang mengetik
pada isian lain. Peta mengukur ulang kanvas saat ditampilkan kembali.
Jika peta gagal dimuat, daftar tetap tersedia dan tombol Coba muat peta
menjalankan ulang pemuatan. Halaman yang tidak ditemukan dan galat halaman
menyediakan tindakan pemulihan; ID pemindaian wajib berupa bilangan bulat positif.

```bash
pnpm install
pnpm dev            # web di :3000
pnpm test           # vitest semua paket
pnpm lint
```

```bash
cd services/engine
uv sync
uv run uvicorn app.main:app --reload   # engine di :8000
uv run pytest
```

## Konvensi

L2 memakai MobileSAM ONNX pada CPU. Dari direktori engine, jalankan
`uv run python -m scripts.unduh_model_vision` untuk mengunduh bobot yang dipatok
beserta pemeriksaan SHA-256, lalu `uv run python -m scripts.buat_fixture_vision`
untuk menghasilkan paket sembilan bangunan demo. Pengulangan biasa memakai
analisis tersimpan; `--force` menjalankan ulang inferensi. Enam footprint tambahan
dapat dibentuk ulang dari respons OSM mentah dengan
`uv run python -m scripts.ambil_bangunan_demo`.

Katalog awal berisi 181 bangunan nyata dari cuplikan OSM dan sembilan contoh
awal. `uv run python -m scripts.buat_katalog_bangunan` membentuk ulang katalog
tanpa membuat analisis. Beranda mengambil bangunan lain di sekitar pusat peta
melalui OSM Map API, pada radius maksimal 200 m. Cakupan dibatasi batas Kota
Bengkulu karena cuaca simulasi memakai acuan Bengkulu 2024.

`GET /api/v1/catalog` membaca katalog lokal, `GET /api/v1/scans/{building_id}`
menyiapkan citra dan hasil tersimpan, dan `POST /api/v1/scans` menjalankan model
bagi bangunan baru. Bangunan yang belum dihitung membawa `analisis: null`.
`GET /api/v1/scans` mengembalikan ID hasil tersimpan. Geometri serta hasil baru
disimpan pada SQLite di `data/cache/`, yang diabaikan Git; citra tidak disimpan.
`GET /api/v1/footprints?barat=…&selatan=…&timur=…&utara=…` membaca footprint
snapshot Mode Kota yang memotong bbox tanpa jaringan, paling banyak 2.000 per
permintaan dengan yang terdekat dari pusat bbox lebih dahulu. Bbox di luar Kota
Bengkulu ditolak. Bangunan snapshot dipindai tanpa memanggil OSM dan masuk
katalog setelah dianalisis. `perkiraan_jenis: "rumah"` adalah tebakan dari luas
footprint, bukan tag OSM; rinciannya ada di `data/fixtures/kota/README.md`.
Direktori cache dapat diubah dengan `PETASURYA_CACHE_DIR`. Hasil model versi lama
tidak dipakai kembali. `/analyze` dan `/simulate` tetap mendukung panggilan lama.

Alur web adalah Bangunan → Batas & luas → Potensi. Potensi luas atap adalah
ekuivalen modul berdasarkan luas; kapasitas skenario untuk simulasi dipilih
terpisah. Nilai awal memakai nilai terkecil antara potensi luas dan daya profil
dalam kVA, sebagai asumsi demo yang dapat diubah, bukan batas izin pemasangan.
Masukan `usable_area_m2` pada `/simulate` membawa luas ekuivalen kapasitas yang
dipilih, sehingga hitung ulang asumsi mempertahankan kapasitas skenario.

`POST /api/v1/analyze` mengembalikan hasil tersimpan tanpa jaringan. `force: true`
menjalankan inferensi dari citra lokal bergeoreferensi bila ada, atau mosaik Esri
dalam memori. Kegagalan citra/model memakai `footprint_fallback` dengan peringatan.
Model membaca potongan di sekitar atap dengan konteks 25%; kanvas penuh dicoba
bila hasil potongan kurang konsisten. Ekspor Acly melakukan normalisasi/padding,
sehingga pemanggil wajib memperbesar RGB **dan** titik ke sisi panjang 1024.
Mask diterima tanpa dipotong ke footprint; overhang yang terbaca tetap dihitung.
Pulau terlepas di bawah 1% komponen terbesar dibuang, lubang besar dipertahankan.
Jalur CV membutuhkan IoU terhadap OSM ≥ 0,65 dan skor heuristik ≥ 0,45.
Ambang ini adalah penyaring konservatif, belum dikalibrasi terhadap acuan yang ditinjau.
IoU ini mengukur kesesuaian dengan OSM,
bukan akurasi terhadap anotasi atap. Skor belum dikalibrasi. Luas mask dihitung
pada ellipsoid WGS84; tilt 15°, cadangan area 15% dan hadap panel tetap asumsi.
Halangan serta bayangan belum diukur. Sumbu persegi panjang minimum modulo 180°
tidak menentukan hadap bidang atap.

Bobot dan tile tidak masuk Git. Ketentuan World Imagery membatasi ekspor luring;
paket demo menyimpan hasil segmentasi, sedangkan citra latar tetap daring.
Untuk citra lokal yang berizin, sediakan `data/tiles/<building_id>.png` dan JSON
dengan bentuk `{"bingkai":{"x0":0,"y0":0,"lebar":640,"tinggi":480,"zoom":19},"source":"nama-sumber"}`.
`x0/y0` adalah asal piksel global Web Mercator pada zoom tersebut, **bukan**
lintang/bujur. Mask dan angka tersimpan tetap dapat ditampilkan tanpa internet.

Alamat engine web memakai `NEXT_PUBLIC_API_BASE` di `apps/web/.env.local`; ubah sebelum menjalankan atau membangun web. Contoh ada di `apps/web/.env.example`.

`POST /api/v1/simulate` mewajibkan `parameter_fisika` berisi `modul` (Wp, dimensi, gamma, NOCT), `albedo`, dan `derate`. Kotoran, mismatch, kabel DC dan ketersediaan adalah fraksi **rugi**; inverter adalah fraksi **efisiensi**. Mesin memakai NOCT dan efisiensi inverter konstan, lalu mengalikan faktor derate sekali. Masukan tersimpan agar hasil dapat direproduksi. Modul demo mengikuti lembar data Jinko F5; albedo dan derate tetap asumsi. Ketiga fixture hasil dihitung ulang dengan `uv run python -m scripts.buat_fixture_simulasi` dari direktori engine, memakai angka serta asalnya dari registri sumber. Jejak ekonomi dan karbon hanya menyebut sumber resmi bila cocok dengan masukan; nilai yang diubah ditandai sebagai masukan pengguna.

- **Bahasa.** Antarmuka, nama fungsi domain (`hitung_ekonomi`, `segmentasi_atap`), komentar, dan pesan commit dalam bahasa Indonesia. Istilah teknis baku tetap Inggris (`payback`, `tilt`, `azimuth`, `mask`).
- **Lapisan.** Mesin hitung disusun berlapis L0–L8 (kontrak → geo → vision → fisika → ekonomi → karbon → agregasi → narasi → rig). Satu perubahan menyentuh satu lapisan. Kontrak dan tes ditulis sebelum implementasi.
- **Versi mesin.** Setiap modul mesin mengekspor `VERSION`. Perubahan numerik apa pun menaikkannya; nilai ini tersimpan di setiap hasil simulasi.
- **Sumber angka.** Tidak ada konstanta eksternal (tarif, faktor emisi, biaya per kWp, parameter modul) tanpa entri di `data/sources/sumber.yaml`. Tes CI menolak yang tidak punya penerbit, URL, dan tanggal.
- **Token desain.** Tidak ada hex, px radius, atau bayangan lepas di komponen — semua lewat `packages/ui`.
- **Gaya Arc.** Seluruh web memakai Geist untuk display, Inter untuk tubuh/prosa, serta radius 18/26/34 px dari Arc; data memakai IBM Plex Mono. Palet PetaSurya tetap menjadi sumber warna. Token motion ada di `tokens.css`, dengan perpindahan dimatikan saat gerak minimal. `BandingLapisan`, `PanelLipat`, `PilihanKartu`, dan `TombolSalin` dipakai pada alur beranda, pemindaian, dan hasil; contoh interaktif ada di `/desain#kreatif`. Lisensi sumber tercantum di `packages/ui/licenses/arc-library-MIT.txt`.
- **Motion demo.** “Demo langsung” menjalankan inferensi baru dengan `force: true`, lalu menampilkan batas/luas dan menghitung potensi melalui API. “Putar ulang hasil” memperagakan analisis tersimpan. Waktu tunggu mengikuti permintaan nyata; sorotan kontur, kamera, grafik, dan aliran energi menjelaskan hasil. Pengguna dapat menjeda atau mengakhiri, interaksi manual menghentikan urutan, dan berpindah tab menjeda demo. Angka serta peringatan tetap mengikuti data; gerak dimatikan pada `prefers-reduced-motion`.
- **Angka di layar.** Selalu bersatuan. Format `id-ID` eksplisit (jangan `toLocaleString()` telanjang — beda locale server/klien memicu hydration mismatch). Angka tabel memakai `tabular-nums`.
- **Kejujuran hasil.** Payback di atas umur sistem ditulis "lebih dari 25 tahun", bukan angka. `irr` dan `payback_years` boleh `null`.
- **Aksesibilitas.** Kontras ≥ 4,5:1 di kedua tema, diuji atas token. Semua kontrol bisa lewat keyboard. `prefers-reduced-motion` dihormati.

## Aturan wajib UX dan teks

**Tidak semua elemen perlu teks. Setiap teks yang terlihat wajib membantu tindakan, keputusan, atau pemahaman hasil.** Aturan ini berlaku untuk layar baru dan perubahan layar lama; contoh penerapannya ada di `/desain#prinsip`.

- Tentukan satu pertanyaan utama pengguna. Jawaban atau aksi berikutnya harus terlihat tanpa membaca paragraf pembuka.
- Hapus teks yang hanya mengulang judul, label, ikon yang sudah jelas, atau keadaan yang sudah terlihat. Jangan menambah subjudul, deskripsi, lencana, dan petunjuk pada setiap komponen secara otomatis.
- Gunakan hierarki, jarak, pengelompokan, bentuk, dan keadaan kontrol sebelum menambah penjelasan. Ruang kosong boleh dibiarkan kosong.
- Tampilkan rincian sekunder lewat pengungkapan bertahap: rincian sebaris, bagian lipat, atau lembar samping. Label isian, satuan, galat, keyakinan rendah, dan penanda data contoh tetap terlihat saat relevan.
- Ikon tanpa teks terlihat hanya untuk aksi universal, seperti tutup, cari, menu, dan tema. Nama aksesibel tetap wajib; bantuan harus dapat diakses dengan fokus dan sentuhan bila diperlukan. `title` saja bukan pengganti label.
- Aksi domain seperti “Pindai atap”, “Ubah asumsi”, dan “Hitung ulang” wajib berlabel terlihat. Jangan menukar paragraf berlebih dengan ikon yang harus ditebak.
- Satu tujuan memakai satu kontrol yang jelas. Hindari tautan dan tombol berulang dengan tujuan sama dalam satu baris; maksimum satu tombol primer per konteks tugas.
- Bahasa produk menyebut kebutuhan pengguna. ID data, versi mesin, istilah internal, dan rincian implementasi masuk ke rincian teknis; batas kemampuan tetap disampaikan singkat di dekat tindakan terkait.

**Syarat lolos tinjauan:** coba hapus setiap teks sekunder. Jika tugas, makna, dan aksesibilitas tetap utuh, teks itu wajib dihapus. Periksa juga urutan fokus, target sentuh, keadaan kosong/galat, dan tampilan 375/1280 px pada kedua tema. Tampilan yang lebih ringkas tetapi lebih sulit digunakan tidak lolos.

## Pesan commit

`<lapisan>: <apa yang berubah>` — contoh: `l3: transposisi POA lolos pvlib`, `web: kartu hasil`, `ui: token tema gelap`, `repo: CI pytest`.

## Evaluasi dan deployment engine

Protokol dan acuan kontur berada di [data/evaluasi/README.md](data/evaluasi/README.md).
Halaman `/evaluasi` membandingkan keluaran terhadap garis visual yang dibuat
tanpa melihat prediksi. Seluruh acuan masih perlu ditinjau anggota tim; hasil
awal tidak membuktikan ketepatan lapangan. Sampel ambigu dan fallback tetap
dilaporkan. Skor penyaringan bukan persentase akurasi.

Engine menyediakan `/api/v1/ready` untuk memeriksa pemuatan model. Satu worker
dan antrean inferensi membatasi pemakaian memori. Konfigurasi CORS dan thread
diatur melalui environment. Panduan [Botkeep](deploy/panel/README.md) memakai
`python main.py` dari akar repositori atau ZIP; panduan [VPS](deploy/README.md)
memakai Docker Compose. `requirements.txt` di akar berasal dari lock engine.
