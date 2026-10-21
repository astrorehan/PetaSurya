"use client";

import Link from "next/link";
import s from "@/components/hasilAtap.module.css";

export default function GalatAtap({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className={s.halaman}>
      <section className={s.keadaan} aria-labelledby="judul-galat">
        <p className={s.label}>HASIL ATAP / GALAT</p>
        <h1 id="judul-galat" className={s.judul}>Hasil belum dapat dimuat.</h1>
        <p className={s.teks}>Terjadi masalah saat membaca analisis. Coba ulangi atau kembali ke peta.</p>
        <div className={s.keadaanAksi}>
          <button className={s.tombolUtama} type="button" onClick={reset}>Coba lagi</button>
          <Link className={s.tombolSekunder} href="/peta">Kembali ke peta</Link>
        </div>
      </section>
    </main>
  );
}
