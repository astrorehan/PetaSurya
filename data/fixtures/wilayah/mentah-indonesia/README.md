# Batas provinsi Indonesia (geoBoundaries)

`geoBoundaries-IDN-ADM1_simplified.geojson` adalah batas 34 provinsi Indonesia
dari geoBoundaries gbOpen (William & Mary geoLab), versi simplified, disimpan
apa adanya.

- Katalog: https://www.geoboundaries.org/api/current/gbOpen/IDN/ADM1/
- Berkas: https://github.com/wmgeolab/geoBoundaries/raw/9469f09/releaseData/gbOpen/IDN/ADM1/geoBoundaries-IDN-ADM1_simplified.geojson
- SHA-256: `5a6be3d1484166132751fe535dd164e1491e657f2d38dced177f067a7bc00d8f`
- Diambil: 25 Oktober 2026
- Lisensi: data diturunkan dari OpenStreetMap, ODbL 1.0; atribusi
  © OpenStreetMap contributors dan geoBoundaries.

Dipakai oleh `services/engine/app/wilayah_id.py` untuk memeriksa bahwa titik atau
bbox berada di Indonesia dan menentukan provinsi. Garis pantai disederhanakan,
sehingga engine memberi toleransi 0,1° di laut; pemeriksaan ini penyaring
cakupan, bukan penetapan batas negara. Entri registri: `geoboundaries_idn_adm1`
di `data/sources/sumber.yaml`.
