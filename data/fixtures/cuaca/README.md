# Fixture cuaca L3

`mentah/nasa-power-bengkulu-2024.json` adalah respons mentah NASA POWER Hourly
API untuk titik centroid fixture bangunan Bengkulu (`lat=-3.76268`,
`lon=102.27168`) sepanjang tahun 2024. Waktu respons memakai UTC dan tahun
2024 memiliki 8.784 baris hourly.

Parameter yang dipakai tes:

- `ALLSKY_SFC_SW_DWN` → GHI, `Wh/m²` per jam
- `ALLSKY_SFC_SW_DNI` → DNI, `Wh/m²` per jam
- `ALLSKY_SFC_SW_DIFF` → DHI, `Wh/m²` per jam
- `T2M` → suhu udara 2 m, °C
- `WS2M` → kecepatan angin 2 m, m/s

Karena intervalnya satu jam, nilai irradiansi numeriknya dipakai sebagai
irradiansi rata-rata `W/m²` pada langkah waktu itu. Tes mengonversi cap waktu
ke `Asia/Jakarta` tanpa mengubah instan waktunya. Respons disimpan apa adanya
agar pembanding L3 dapat diulang tanpa memanggil layanan luar.

## Cuaca per lokasi

Simulasi memakai cuaca sel NASA POWER yang memuat bangunan (`app/cuaca.py`,
`muat_cuaca(lat, lon)`). Query sama dengan berkas di atas: community `RE`,
parameter yang sama, 20240101–20241231, `time-standard=UTC` (bawaan API adalah
waktu surya lokal). Resolusi aslinya 1° × 1° untuk iradiansi (CERES SYN1deg)
dan 0,5° lintang × 0,625° bujur untuk suhu dan angin (MERRA-2); tepinya
dipastikan dengan menyapu titik uji ke API. Kunci sel adalah keempat indeksnya;
bangunan yang berdekatan berbagi satu respons.

- Titik dalam sel yang sama dengan `nasa-power-bengkulu-2024.json` (kunci
  `-4, 102, -8, 164`) memakai berkas ini tanpa jaringan. Respons API untuk
  titik tengah sel itu identik bit demi bit dengan berkas ini. Seluruh 686
  bangunan katalog (termasuk sembilan contoh) dan 120.925 dari 120.975 footprint
  snapshot berada di sel tersebut; 42 footprint di utara lintang -3,75° dan 8 di
  barat bujur 102,1875° berada di sel meteorologi lain dan memerlukan unduhan.
- Sel lain diunduh sekali lewat `GET /api/temporal/hourly/point` pada titik
  tengah irisan sel surya dan meteorologi, lalu respons mentah disimpan di
  `data/cache/cuaca/` (atau `PETASURYA_CACHE_DIR`), diabaikan Git. Unduhan
  serempak untuk sel yang sama digabung. Gagal jaringan, HTTP, atau respons
  tidak lengkap menghasilkan galat 503 `GEODATA_UNAVAILABLE`.
- Suhu dan angin adalah rerata sel; elevasi sel (ada di respons) dapat berbeda
  dari bangunan sehingga suhu bangunan di pegunungan atau pesisir bisa meleset.
- Posisi matahari dihitung di titik cuaca; selisih terhadap bangunan paling
  jauh ±0,5° (±2 menit waktu surya). Indeks waktu dilabeli `Asia/Jakarta` di
  seluruh Indonesia; label tidak menggeser instan sehingga posisi matahari tetap
  benar, hanya pengelompokan bulan memakai kalender WIB.
- Sumber dan syarat pengutipan: `nasa_power_hourly_nasional_2024` di
  `data/sources/sumber.yaml`.

