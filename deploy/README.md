# Engine PetaSurya di VPS

Untuk hosting aplikasi Python melalui GitHub atau ZIP, ikuti
[panduan Botkeep](panel/README.md). Konfigurasi Docker berikut ditujukan untuk
VPS dengan akses Docker Engine.

Untuk memeriksa satu inferensi secara interaktif sebelum memilih hosting, gunakan
[notebook Colab](colab/README.md). Pengujian ini mengukur runtime dan tidak
mengubah alamat API pada website.

Engine menjalankan MobileSAM ONNX pada CPU. Bobot dipatok ke revisi dan SHA-256
di manifest model, lalu diunduh saat membangun image. Citra satelit diproses
dalam memori; volume persisten hanya menyimpan geometri dan hasil analisis.

## Persiapan dan pemeriksaan lokal

Jalankan dari akar repositori dengan Docker Engine dan Docker Compose aktif:

```sh
docker compose -f deploy/compose.yaml --env-file deploy/.env.example config --quiet
docker compose -f deploy/compose.yaml --env-file deploy/.env.example build engine
docker compose -f deploy/compose.yaml --env-file deploy/.env.example up -d engine
curl --fail http://127.0.0.1:8000/api/v1/ready
```

`/health` memeriksa proses HTTP. `/ready` benar-benar memuat encoder dan decoder;
hasilnya 503 jika inferensi belum siap. Satu worker menjaga hanya satu salinan
model dan satu antrean inferensi. Batas CPU, memori dan thread pada contoh
adalah konfigurasi awal yang perlu diukur pada server tujuan, bukan jaminan kapasitas.
Pada uji lokal dengan `PETASURYA_MEMORY_LIMIT=1g`, enam inferensi berturut-turut
mencapai puncak RSS ±505 MiB tanpa OOM, sehingga VPS 1 GB dengan swap dapat dicoba.

## Pemasangan dengan HTTPS

1. Siapkan VPS Linux x86-64 dengan Docker Engine/Compose. Arahkan DNS domain API
   ke alamat server. Port 80 dan 443 harus mencapai Caddy.
2. Salin source proyek ke server dan salin `deploy/.env.example` menjadi
   `deploy/.env`. Isi domain API dan origin website yang benar. File `.env`
   diabaikan Git. `PETASURYA_CORS_ORIGINS` menerima beberapa origin dipisahkan koma.
3. Bangun dan jalankan:

```sh
docker compose -f deploy/compose.yaml --env-file deploy/.env --profile publik up -d --build
docker compose -f deploy/compose.yaml --env-file deploy/.env ps
curl --fail https://api.example.com/api/v1/ready
```

Caddy menerbitkan dan memperbarui sertifikat otomatis. Port engine dipasang pada
loopback saja; akses publik melewati Caddy. HTTP 503 dengan `Retry-After: 10`
berarti antrean inferensi penuh dan permintaan dapat dicoba ulang.

4. Isi `NEXT_PUBLIC_API_BASE=https://api.example.com` pada konfigurasi web,
   lalu bangun ulang web. Nilai itu tertanam saat build Next.js. Jika web memakai
   HTTPS, API juga perlu HTTPS. Origin berisi skema dan host, tanpa path.
5. Uji satu bangunan baru, analisis ulang, simulasi dan hitung ulang dari web.
   Lihat log engine bila `/ready` atau akses citra gagal.

```sh
docker compose -f deploy/compose.yaml --env-file deploy/.env logs --tail 100 engine
```

## Data dan pembaruan

Volume `hasil` menyimpan SQLite. Cadangkan volume sebelum memperbarui engine.
`docker compose down` mempertahankan data; jangan menambahkan `--volumes` saat
ingin mempertahankan hasil. Simpan revisi source dan image yang dipakai untuk
memudahkan kembali ke versi sebelumnya.

Untuk model atau algoritme baru, jalankan evaluasi pada dataset terpisah lebih
dahulu. VPS menyediakan layanan daring; perubahan server tidak meningkatkan
ketepatan kontur. Panduan evaluasi ada di `data/evaluasi/README.md`.
