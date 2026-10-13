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

`POST /api/v1/analyze` mengembalikan hasil tersimpan tanpa jaringan. `force: true`
menjalankan inferensi dari citra lokal bergeoreferensi bila ada, atau mosaik Esri
dalam memori. Kegagalan citra/model memakai `footprint_fallback` dengan peringatan.
Mask dinilai **sebelum** dipotong ke footprint. Jalur CV membutuhkan IoU terhadap
OSM > 0,5 dan skor heuristik ≥ 0,45. IoU ini mengukur kesesuaian dengan OSM,
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
