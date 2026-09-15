# Fixture

Bangunan uji nyata di Kota Bengkulu beserta sumbernya (OSM via Overpass: respons mentah,
URL kueri, tanggal ambil). Angka hasil simulasi yang belum keluar dari mesin diberi
`"_catatan": "contoh"` dan ditampilkan berlabel contoh di antarmuka.

Struktur: `bangunan/`, `analisis/`, `simulasi/`, `cuaca/`.

## Bangunan (`bangunan/`)

Tiga way OSM di Kandang Limun, sekitar Universitas Bengkulu, dipilih supaya tiga tipe pengguna terwakili:

| Berkas | OSM | Tag | Jejak |
| --- | --- | --- | --- |
| `rumah-kandang-limun.json` | way/1145010599 | `building=house` | 277,9 m² |
| `toko-wr-supratman.json` | way/991016391 | `shop=convenience` (Indomaret, Jl. WR Supratman 46) | 244,6 m² |
| `kampus-fh-unib.json` | way/1146141501 | `building=university`, 2 lantai (Fakultas Hukum UNIB) | 1.505,3 m² |

Respons Overpass mentah (`out meta geom`) ada di `bangunan/mentah/`; berkas fixture dibuat ulang dengan
`python services/engine/scripts/buat_fixture_bangunan.py`. Kunci `_sumber` mencatat URL, kueri, dan tanggal ambil.

## Analisis (`analisis/`) dan simulasi (`simulasi/`)

Dua jalur L2 — `cv` (dengan mask) dan `footprint_fallback` (tanpa mask, `peringatan`, keyakinan < 0,45) — serta satu
hasil `/simulate`. Semuanya angka contoh dari cetak biru, ditandai `"_catatan": "contoh dari cetak biru, bukan hasil
hitungan"`. Tes `packages/contracts/src/fixture.test.ts` dan `services/engine/tests/test_contracts.py` memvalidasi
setiap berkas terhadap kontrak di dua bahasa.

