# Panduan kontribusi

PetaSurya adalah peta potensi PLTS atap tingkat bangunan untuk Indonesia. Pemilik rumah dan UMKM mendapat angka balik modal yang jujur; perencana kota mendapat potensi wilayah dalam MWp dan tCO₂e.

## Struktur repo

| Jalur | Isi |
| --- | --- |
| `apps/web` | Next.js (App Router), satu-satunya antarmuka. Peta memakai MapLibre GL. |
| `services/engine` | FastAPI, Python 3.12. Satu service: geo, vision, physics, economics, carbon, aggregate, narrate, telemetry. |
| `packages/contracts` | Skema zod — sumber kebenaran tipe. Di-generate ke pydantic untuk engine. |
| `packages/ui` | Token desain, format angka, primitif bersama. |
| `data/fixtures` | Bangunan uji nyata beserta sumbernya. |
| `data/sources/sumber.yaml` | Setiap angka eksternal: nilai, satuan, penerbit, URL, tanggal diambil. |

## Menjalankan

```bash
pnpm install
pnpm dev            # web di :3000
pnpm test           # vitest semua paket
pnpm lint
```

```bash
cd services/engine
uv sync
uv run uvicorn app.main:app --reload   # engine di :8000
uv run pytest
```

## Konvensi

- **Bahasa.** Antarmuka, nama fungsi domain (`hitung_ekonomi`, `segmentasi_atap`), komentar, dan pesan commit dalam bahasa Indonesia. Istilah teknis baku tetap Inggris (`payback`, `tilt`, `azimuth`, `mask`).
- **Lapisan.** Mesin hitung disusun berlapis L0–L8 (kontrak → geo → vision → fisika → ekonomi → karbon → agregasi → narasi → rig). Satu perubahan menyentuh satu lapisan. Kontrak dan tes ditulis sebelum implementasi.
- **Versi mesin.** Setiap modul mesin mengekspor `VERSION`. Perubahan numerik apa pun menaikkannya; nilai ini tersimpan di setiap hasil simulasi.
- **Sumber angka.** Tidak ada konstanta eksternal (tarif, faktor emisi, biaya per kWp, parameter modul) tanpa entri di `data/sources/sumber.yaml`. Tes CI menolak yang tidak punya penerbit, URL, dan tanggal.
- **Token desain.** Tidak ada hex, px radius, atau bayangan lepas di komponen — semua lewat `packages/ui`.
- **Angka di layar.** Selalu bersatuan. Format `id-ID` eksplisit (jangan `toLocaleString()` telanjang — beda locale server/klien memicu hydration mismatch). Angka tabel memakai `tabular-nums`.
- **Kejujuran hasil.** Payback di atas umur sistem ditulis "lebih dari 25 tahun", bukan angka. `irr` dan `payback_years` boleh `null`.
- **Aksesibilitas.** Kontras ≥ 4,5:1 di kedua tema, diuji atas token. Semua kontrol bisa lewat keyboard. `prefers-reduced-motion` dihormati.

## Pesan commit

`<lapisan>: <apa yang berubah>` — contoh: `l3: transposisi POA lolos pvlib`, `web: kartu hasil`, `ui: token tema gelap`, `repo: CI pytest`.
