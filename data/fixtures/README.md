# Fixture

Bangunan uji nyata di Kota Bengkulu beserta sumbernya (OSM via Overpass: respons mentah,
URL kueri, tanggal ambil). Angka hasil simulasi yang belum keluar dari mesin diberi
`"_catatan": "contoh"` dan ditampilkan berlabel contoh di antarmuka.

Struktur: `bangunan/`, `wilayah/`, `analisis/`, `simulasi/`, `parameter/`, `cuaca/`.

`parameter/fisika-contoh.json` memakai spesifikasi Jinko JKM550M-72HL4(-V)
revisi F5 dari registri sumber. Albedo dan faktor rugi tetap asumsi demo,
bukan pengukuran lapangan. Seluruh parameter wajib dikirim ke mesin.

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

Dua jalur L2 — `cv` (dengan mask) dan `footprint_fallback` (tanpa mask,
`peringatan`, keyakinan < 0,45) — tetap contoh analisis, bukan hasil survei.
Ketiga simulasi dihitung dengan mesin dari cuaca NASA POWER 2024, tarif dasar
Permen 7/2024, biaya acuan IESR 2020, faktor CM ex-ante Sumatera 2019, dan
modul Jinko F5. SCR, daya pelanggan, diskonto, OPEX, degradasi, albedo, serta
rugi operasional adalah asumsi skenario. Label demo tetap terlihat.

Biaya Rp14,5 juta/kWp adalah titik tengah acuan Rp14–15 juta/kWp pada laporan
IESR April 2020, bukan penawaran pemasangan 2026. Tarif memakai dasar
peraturan; bukti tidak naik dibaca hingga September 2026. Faktor emisi
0,84 tCO2/MWh memakai kolom CM ex-ante bobot OM/BM 0,75/0,25 dan mencakup
komponen CO2 saja. Sumber lengkap terdapat di `data/sources/sumber.yaml`.

Buat ulang dari direktori `services/engine`:
`uv run python -m scripts.buat_fixture_simulasi`. Skrip mempertahankan ID
fixture dan menyimpan seluruh masukan fisika beserta jejak ekonomi/karbon.
Tes dua bahasa memvalidasi kontrak; tes sumber demo memeriksa bahwa CAPEX,
penghematan, energi bulanan, dan emisi cocok dengan masukan yang tersimpan.

## Wilayah (`wilayah/`)

`kota-bengkulu.geojson` dan `kecamatan-kota-bengkulu.geojson` dibuat dari
relasi batas administratif OpenStreetMap melalui Overpass. Batas kota memakai
relasi `relation/16196019` (tag `official_name=Kota Bengkulu`). Saat fixture
diambil, OSM mengembalikan tiga relasi `admin_level=6` di sekitar kota:
`16196021` Muara Bangka Hulu, `16196022` Sungai Serut, dan `16196023`
Singaran Pati. Batas lain yang belum tersedia tidak digambar atau diisi dengan
geometri rekaan.

Respons mentah tersimpan di direktori yang sama. Sungai Serut diambil sebagai
metadata relasi dan way `outer` anggota secara terpisah karena respons relasi
lengkap melewati batas waktu endpoint Overpass. Skrip
`services/engine/scripts/buat_fixture_wilayah.py` menyambung way tersebut
menjadi GeoJSON; koordinat tetap WGS84 `[lon, lat]`.
