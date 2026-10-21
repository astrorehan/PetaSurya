# Snapshot Mode Kota Bengkulu

`mentah/bangunan-bengkulu-20261014.overpass.json.gz` adalah respons Overpass
untuk way dengan `building` serta relasi multipolygon bangunan pada area OSM
3616196019. Snapshot OSM: 14 Oktober 2026, 16:04:41 UTC. Penerbit:
OpenStreetMap contributors, ODbL 1.0. Kueri dan URL tersimpan pada `sumber`
dalam `bangunan-bengkulu.json.gz` dan registri sumber bersama.

121.033 objek mentah menghasilkan 121.016 footprint valid dengan titik
interior di batas Kota Bengkulu. Satu geometri tidak valid dan 16 objek di
luar batas dikeluarkan. Luas dihitung geodesik WGS84, lubang multipolygon
dipertahankan, dan way anggota relasi yang diterima tidak dihitung lagi.

Tiga batas kecamatan yang tersedia memuat 20.090 footprint Muara Bangka
Hulu, 8.842 Sungai Serut, dan 12.690 Singaran Pati. Sebanyak 79.394 belum
memiliki pasangan batas kecamatan; tetap masuk jumlah kota dalam kelompok
terpisah. Snapshot ini bukan sensus atau ukuran kelengkapan seluruh atap
kota. Identitas OSM, luas dan pasangan wilayah tersimpan; geometri asli
dapat diperiksa dalam respons mentah. Hash batas kecamatan mengikat hasil
pemasangan wilayah ke berkas batas yang dipakai. Hash dihitung setelah CRLF
dinormalkan menjadi LF, sehingga checkout Windows dan Linux memuat snapshot
yang sama.

`permintaan-bengkulu.json` berisi skenario contoh dan parameter eksplisit.
Fraksi layak, tilt, hadap, SCR, albedo dan rugi merupakan asumsi seragam.
Kapasitas adalah ekuivalen modul dari luas footprint, belum pemeriksaan
struktur, bayangan, sambungan listrik, penataan modul atau izin pemasangan.

Dari direktori engine:

```bash
uv run python -m scripts.ambil_bangunan_kota
uv run python -m scripts.ambil_bangunan_kota --unduh --tanggal 2026-10-14
```

Perintah pertama membentuk ulang snapshot tanpa jaringan. Gzip memakai cap
waktu nol agar hasil dapat dibentuk ulang secara identik.
