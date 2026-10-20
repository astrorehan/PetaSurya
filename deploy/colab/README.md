# Uji engine PetaSurya di Colab

Notebook ini menjalankan pemasangan, pemeriksaan model dan satu inferensi baru
pada CPU. Website belum diarahkan ke runtime ini. Proses HTTP pengujian berhenti
setelah hasil tersimpan; tidak ada tunnel atau layanan publik yang dibuat.

1. Pilih Python 3, CPU, High-RAM nonaktif dan runtime version 2026.07
   (Python 3.12). Paket engine saat ini memerlukan Python 3.12.
2. Buka `PetaSurya-Uji-Colab.ipynb` di Colab dan jalankan berurutan.
3. Saat diminta, unggah `petasurya-engine-colab.zip` hasil pembentukan paket.
4. Periksa status model, metode keluaran, waktu inferensi dan RAM. Metode
   `footprint_fallback` harus dibaca sebagai perkiraan OSM, bukan kontur model.

Jalankan `python deploy/buat_paket_colab.py` dari akar repo untuk membentuk ZIP
dan memperbarui notebook. ZIP memakai whitelist source/data/bobot yang sama
dengan paket engine Python; lingkungan lokal, kredensial dan citra tidak ikut.
Dependensi dipasang ke direktori aplikasi, terpisah dari paket notebook.

`hasil-uji-colab.json` menyimpan respons asli dan pengukuran runtime, sedangkan
`uji-engine.log` memuat log proses. Citra hanya dimuat dari URL penyedia saat
pratinjau dibuka. Kontur dan luas belum merupakan verifikasi kondisi lapangan.
Menambah RAM atau memilih GPU tidak dengan sendirinya meningkatkan akurasi.

Runtime dapat berhenti dan file lokal dapat hilang. Simpan JSON bila diperlukan.
Colab memprioritaskan komputasi interaktif dan bukan jaminan ketersediaan API.

Rujukan:
- https://research.google.com/colaboratory/runtime-version-faq.html
- https://research.google.com/colaboratory/faq.html
