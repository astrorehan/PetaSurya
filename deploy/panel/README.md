# Engine PetaSurya untuk Botkeep

Paket ini hanya berisi engine Python, data perhitungan, dan bobot MobileSAM yang
terverifikasi. Website Next.js dibangun dan dihosting terpisah.

## Dari GitHub

Pilih Application → Python 3.12 → GitHub, lalu repositori
`https://github.com/astrorehan/PetaSurya` dan cabang yang sudah berisi perubahan
deployment. Isi project root dengan `.` dan gunakan `python main.py`.
`requirements.txt` di akar dibentuk dari lock engine, sehingga runtime Python
tidak perlu membangun paket Node.js. File `.onnx` tidak berada di Git; startup
mengunduh bobot yang dipatok dan memeriksa SHA-256. Pengulangan startup memakai
bobot yang sudah valid. Konfigurasi Environment, port dan Domains sama dengan
paket ZIP di bawah.

## Isian Create server

| Isian | Nilai |
| --- | --- |
| Jenis | Application |
| Runtime | Python 3.12 |
| Source | GitHub atau ZIP |
| Nama | petasurya-engine |
| RAM | 2.048 MB |
| CPU | 150% |
| Storage | 2.048 MB |
| Start command | `python main.py` |

Alokasi ini menggunakan seluruh kapasitas Founder Free pada panel. Kapasitas
tersebut dibagi di tingkat akun. Python 3.12 harus tersedia pada pilihan runtime.

Untuk source ZIP, unggah `petasurya-engine-botkeep.zip` langsung. `main.py` dan `requirements.txt`
berada di akar ZIP. Dependensi dikunci beserta hash. Jika runtime belum memasang
dependensi, entry point memasangnya ke `.runtime/packages` tanpa membutuhkan root
dan tanpa cache unduhan. Bobot model sudah disertakan dan diperiksa ulang.

## Environment dan Network

Tambahkan lewat Environment:

```dotenv
PETASURYA_CORS_ORIGINS=https://alamat-website-anda
PETASURYA_MODEL_THREADS=1
PETASURYA_PRELOAD_MODEL=1
```

Untuk mencoba dari web lokal, origin dapat berisi
`http://localhost:3000,http://127.0.0.1:3000`. Jangan memakai wildcard.
`main.py` membaca `.env` yang dikelola panel serta variabel proses. Nilai proses
memiliki prioritas. Jangan mengunggah file `.env` berisi kredensial.

Port diambil dari `SERVER_PORT` yang diberikan panel, kemudian `PORT` bila
tersedia. Engine mengikat `0.0.0.0`. Konfigurasikan alias atau domain HTTPS di
menu Domains menuju port yang ditampilkan Network.

## Memastikan layanan siap

Console harus menampilkan startup berhasil. Buka:

```text
https://alamat-api-anda/api/v1/ready
```

Hasil yang diharapkan memuat `status: ready` dan `CPUExecutionProvider`.
`/health` saja belum membuktikan bobot dapat dimuat. Jika Console menyatakan
runtime Python tidak sesuai, pilih versi 3.12; jika library native tidak tersedia,
konfirmasikan dukungan runtime tersebut ke penyedia.

Isi `NEXT_PUBLIC_API_BASE=https://alamat-api-anda` pada konfigurasi web dan bangun
ulang Next.js. Uji Demo langsung dan Hitung potensi dari website.

Hasil baru berada di `data/cache/hasil.sqlite3`. Simpan cadangan sebelum mengganti
ZIP atau menghapus server. Citra satelit tidak ditulis ke storage.

Rujukan penyedia:
- https://botkeep.cloud/docs/github
- https://botkeep.cloud/docs/hosting
- https://botkeep.cloud/docs/python
- https://botkeep.cloud/docs/zip
