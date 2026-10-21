# PetaSurya

**Atapmu, dihitung.**

Peta potensi PLTS atap tingkat bangunan untuk Indonesia, dimulai dari Kota Bengkulu.
Pilih atap di peta, lalu lihat luas atap yang terbaca dari citra satelit, kapasitas
kWp, produksi kWh per tahun, penghematan rupiah, waktu balik modal, dan tCO₂e yang
terhindar. Setiap angka membawa rumus dan sumbernya.

## Yang bisa dilakukan

- **Pilih bangunan mana pun di kota.** `/peta` memuat 120.975 footprint OpenStreetMap
  Kota Bengkulu sesuai area peta yang terlihat. Bangunan tanpa nama seukuran rumah
  diberi label *Perkiraan rumah* — tebakan dari luas, bukan tag OSM.
- **Pindai atap.** MobileSAM (ONNX, CPU) membaca batas atap dari citra Esri World
  Imagery yang hanya diproses di memori. Bila hasil model kurang meyakinkan, jejak
  OSM dipakai sebagai cadangan dan ditandai.
- **Hitung potensi.** Transposisi Hay-Davies, suhu sel NOCT, derate, tarif PLN
  Permen ESDM 7/2024, dan faktor emisi jaringan Sumatera. Asumsi dapat diubah lalu
  dihitung ulang.
- **Hasil tersimpan.** Setiap analisis disimpan sehingga bangunan yang sama terbuka
  lagi tanpa inferensi ulang. Satu kawasan dapat dianalisis sekaligus dengan skrip
  batch yang lajunya dibatasi.
- **Mode Kota.** `/kota/1771` menjumlahkan potensi per kecamatan dalam MWp, MWh,
  tCO₂e, dan investasi, dengan penggeser tingkat adopsi.

## Batas yang perlu diketahui

- Cakupan baru Kota Bengkulu; cuaca simulasi memakai acuan Bengkulu 2024.
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
