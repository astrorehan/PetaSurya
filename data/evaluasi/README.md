# Evaluasi kontur atap Bengkulu

Dataset ini memisahkan acuan visual dari hasil segmentasi dan dari footprint
OSM yang memandu model. Status hasil masih **awal, belum ditinjau anggota tim**.
Acuan tidak boleh disebut hasil survei lapangan atau bukti ketepatan 3D.

## Pemilihan dan pemisahan

Manifest membekukan 30 bangunan dari snapshot OSM Kota Bengkulu: sepuluh atap
40–150 m², sepuluh 150–500 m², dan sepuluh 500–2.500 m². Urutan SHA-256 ID dan
seed menentukan pemilihan sebelum prediksi diperiksa. Sembilan contoh demo
dikecualikan. Dua puluh sampel dipakai untuk pengembangan; sepuluh sisanya untuk
pengujian akhir setelah keputusan algoritme ditetapkan.

Setiap sampel memiliki geometri, bingkai piksel dan sumber tile. Setiap acuan
dan prediksi mencatat hash RGB citra agar perbandingan memakai input yang sama.
Citra tidak disimpan dalam repositori atau dihosting ulang.

## Acuan dan tinjauan

```sh
cd services/engine
uv run python -m scripts.anotasi_atap --port 8061
```

Buka `http://127.0.0.1:8061/galeri` untuk pemeriksaan enam sampel sekaligus atau
`http://127.0.0.1:8061/?tinjau=1` untuk editor acuan yang sudah tersimpan.
Layar anotasi tidak menerima geometri OSM atau prediksi model.
Titik putih hanya membantu menemukan bangunan sasaran.

Gambar tepi atap yang terlihat, termasuk overhang. Jangan memasukkan dinding
yang terlihat karena sudut citra. Lubang dan beberapa komponen didukung editor.
Jika pohon, citra usang, pergeseran lokasi, atau bangunan berimpit membuat
batas tidak pasti, simpan status ambigu beserta alasan. Sampel tersebut tetap
tercatat dalam penyebut cakupan, tetapi tidak memiliki nilai IoU acuan.

Acuan awal berisi 14 kontur dan 16 sampel ambigu. Anggota tim perlu memeriksa
ulang keduanya, menggunakan konteks citra yang lebih luas jika diperlukan.
Perubahan acuan mengubah hash laporan; terbitkan laporan baru setelah tinjauan.
Jangan mengubah acuan agar menyerupai prediksi.

## Inferensi dan perhitungan

```sh
uv run python -m scripts.evaluasi_vision inferensi --nama final --split semua
uv run python -m scripts.evaluasi_vision laporan --nama final
```

Inferensi dapat dilanjutkan tanpa mengulang hasil yang berhasil. Implementasi
yang berubah memerlukan nama keluaran baru. Jangan memakai ulang sampel uji
untuk memilih parameter pada putaran berikutnya; siapkan dataset uji baru.

Laporan menampilkan IoU dan Dice kontur serta kesalahan luas relatif terhadap
acuan. Luas memakai ellipsoid WGS84 dan overlap memakai proyeksi setempat.
Pada fallback, kontur pembanding adalah footprint yang ditampilkan, sedangkan
galat luas memakai angka estimasi yang benar-benar dikembalikan API.

Semua hasil, hanya hasil CV yang diterima, fallback, sumber gagal, sampel belum
dijalankan, dan acuan ambigu dilaporkan terpisah. Skor penyaringan internal
tidak dikonversi menjadi persentase akurasi. Waktu proses termasuk pengambilan
citra dan inferensi pada mesin pengujian, bukan pengukuran VPS.

Pola titik tambahan diuji pada sampel pengembangan dengan opsi `--perkuat`.
Kriteria utama pemilihan adalah rata-rata IoU seluruh hasil yang memiliki
acuan, termasuk fallback. Data uji akhir dibuka setelah keputusan dibekukan.
