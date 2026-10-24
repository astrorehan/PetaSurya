# PetaSurya

**Atapmu, dihitung.**

Peta potensi PLTS atap tingkat bangunan untuk seluruh Indonesia.
Pilih atap di peta, lalu lihat luas atap yang terbaca dari citra satelit, kapasitas
kWp, produksi kWh per tahun, penghematan rupiah, waktu balik modal, dan tCO₂ yang
terhindar. Setiap angka membawa rumus dan sumbernya.

## Yang bisa dilakukan

- **Pilih bangunan di mana pun di Indonesia.** `/peta` memuat footprint
  OpenStreetMap sesuai area peta: Kota Bengkulu dari snapshot 120.975 bangunan,
  daerah lain langsung dari OSM di sekitar pusat peta. Alamat dapat dicari
  se-Indonesia. Di Bengkulu, bangunan tanpa nama seukuran rumah diberi label
  *Perkiraan rumah*, yaitu tebakan dari luas, bukan tag OSM.
- **Pindai atap.** MobileSAM (ONNX, CPU) membaca batas atap dari citra Esri World
  Imagery yang hanya diproses di memori. Bila hasil model kurang meyakinkan, jejak
  OSM dipakai sebagai cadangan dan ditandai.
- **Hitung potensi.** Transposisi Hay-Davies, suhu sel NOCT, derate, tarif PLN
  Permen ESDM 7/2024, cuaca NASA POWER 2024 di lokasi bangunan, dan faktor emisi
  sistem kelistrikan provinsinya (Gatrik 2019). Asumsi dapat diubah lalu dihitung
  ulang.
- **Hasil tersimpan.** Setiap analisis disimpan sehingga bangunan yang sama terbuka
  lagi tanpa inferensi ulang. Satu kawasan dapat dianalisis sekaligus dengan skrip
  batch yang lajunya dibatasi.
- **Mode Kota.** `/kota/1771` menjumlahkan potensi per kecamatan dalam MWp, MWh,
  tCO₂, dan investasi, dengan penggeser tingkat adopsi.

## Batas yang perlu diketahui

- Analisis tersedia di seluruh Indonesia. Mode Kota dan hasil batch kawasan baru
  mencakup Kota Bengkulu. Di luar Bengkulu, footprint dan alamat bergantung pada
  kelengkapan OSM dan memerlukan internet.
- Faktor emisi provinsi yang dilayani banyak sistem terpisah (antara lain NTT,
  Maluku, Papua) tidak ditebak; pengguna mengisinya sendiri.
- Luas atap adalah proyeksi pada citra, bukan luas permukaan miring. Halangan dan
  bayangan belum diukur. Tilt, hadap panel, dan cadangan area adalah asumsi.
- Ambang penyaring model belum dikalibrasi terhadap acuan yang ditinjau; skornya
  bukan persentase akurasi. Hasil evaluasi awal ada di `/evaluasi`.
- Angka adalah estimasi awal; kondisi atap perlu ditinjau di lapangan.

## Struktur

| Jalur | Isi |
| --- | --- |
| `apps/web` | Next.js (App Router) dan MapLibre GL — satu-satunya antarmuka |
| `services/engine` | FastAPI, Python 3.12: geo, vision, fisika, ekonomi, karbon, agregasi |
| `packages/contracts` | Skema zod, sumber tipe; di-generate ke pydantic untuk engine |
| `packages/ui` | Token desain, format angka, komponen bersama |
| `data/fixtures` | Bangunan, wilayah, dan snapshot kota beserta sumbernya |
| `data/sources/sumber.yaml` | Setiap angka eksternal: nilai, satuan, penerbit, URL, tanggal |

## Menjalankan

```bash
pnpm install
pnpm dev                      # web di :3000
```

```bash
cd services/engine
uv sync
uv run python -m scripts.unduh_model_vision   # bobot MobileSAM + cek SHA-256
uv run uvicorn app.main:app --reload          # engine di :8000
```

Alamat engine untuk web diatur lewat `NEXT_PUBLIC_API_BASE` di `apps/web/.env.local`
(contoh di `apps/web/.env.example`). Tes: `pnpm test`, `pnpm lint`, dan
`uv run pytest` dari `services/engine`. Panduan hosting engine ada di
[deploy/README.md](deploy/README.md).

Konvensi lapisan, sumber angka, aturan teks antarmuka, dan rincian API ada di
[CONTRIBUTING.md](CONTRIBUTING.md).

## Data dan lisensi pihak ketiga

Footprint bangunan © kontributor OpenStreetMap (ODbL 1.0). Citra © Esri, Vantor,
Earthstar Geographics; tile tidak disimpan maupun disertakan di repositori. Bobot
model diunduh terpisah dan tidak masuk Git.
