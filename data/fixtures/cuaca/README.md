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
