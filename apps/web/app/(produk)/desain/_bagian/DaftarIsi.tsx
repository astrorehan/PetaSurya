"use client";

import { useEffect, useState } from "react";
import s from "./daftarIsi.module.css";

export type ButirIsi = { id: string; nomor: string; judul: string };

/*
 * Daftar isi lembar. Butir aktif = bagian terakhir yang kepalanya sudah
 * melewati garis baca (header + 25 % tinggi layar). Dihitung saat gulir
 * lewat requestAnimationFrame; tanpa animasi, hanya penanda yang berpindah.
 */
export function DaftarIsi({ butir }: { butir: readonly ButirIsi[] }) {
  const [aktif, setAktif] = useState<string | null>(null);

  useEffect(() => {
    let bingkai = 0;
    const hitung = () => {
      bingkai = 0;
      const garis = window.innerHeight * 0.25 + 56;
      let terpilih: string | null = null;
      for (const b of butir) {
        const el = document.getElementById(b.id);
        if (el && el.getBoundingClientRect().top <= garis) terpilih = b.id;
      }
      setAktif(terpilih);
    };
    const jadwal = () => {
      if (!bingkai) bingkai = requestAnimationFrame(hitung);
    };
    hitung();
    window.addEventListener("scroll", jadwal, { passive: true });
    window.addEventListener("resize", jadwal);
    return () => {
      cancelAnimationFrame(bingkai);
      window.removeEventListener("scroll", jadwal);
      window.removeEventListener("resize", jadwal);
    };
  }, [butir]);

  return (
    <nav className={s.daftarIsi} aria-label="Isi lembar">
      <p className={s.judul}>Isi lembar</p>
      <ol className={s.daftar}>
        {butir.map((b) => (
          <li key={b.id}>
            <a href={`#${b.id}`} className={s.butir} aria-current={aktif === b.id ? "location" : undefined}>
              <span className={s.nomor}>{b.nomor}</span>
              <span>{b.judul}</span>
            </a>
          </li>
        ))}
      </ol>
    </nav>
  );
}
