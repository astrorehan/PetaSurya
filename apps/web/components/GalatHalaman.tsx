"use client";

import Link from "next/link";
import { RotateCw, Sun } from "lucide-react";
import { Tombol, kelasTombol } from "@petasurya/ui";
import s from "./statusHalaman.module.css";

export function GalatHalaman({ reset }: { reset: () => void }) {
  return (
    <main className={s.halaman}>
      <div className={s.ikon} aria-hidden="true"><Sun size={36} strokeWidth={1.4} /></div>
      <p className={s.label}>HALAMAN BELUM DAPAT DIMUAT</p>
      <h1 className={s.judul}>Coba sekali lagi.</h1>
      <p className={s.teks} role="alert">Terjadi kendala saat menyiapkan halaman. Muat ulang untuk melanjutkan.</p>
      <div className={s.aksi}>
        <Tombol varian="primer" onClick={reset} ikon={RotateCw}>Coba lagi</Tombol>
        <Link href="/" className={kelasTombol("sekunder")}>Ke beranda</Link>
      </div>
    </main>
  );
}
