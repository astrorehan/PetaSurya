"use client";

import { X } from "lucide-react";
import { useEffect, useId, useRef, type ReactNode } from "react";
import { Tombol } from "./Tombol";
import s from "./lembar.module.css";

/**
 * Lembar samping non-modal untuk jejak hitungan dan panel asumsi.
 * Desktop: menempel di kanan, halaman tetap bisa dipakai (tanpa tirai).
 * Ponsel (< 768 px): lembar bawah. Masuk dan keluar lewat jalur yang sama.
 * Esc menutup; fokus pindah ke judul saat dibuka dan kembali ke pemicunya
 * saat ditutup. Saat tertutup lembar `inert`: tidak terjangkau Tab.
 */
export function LembarSamping({
  terbuka,
  onTutup,
  judul,
  keterangan,
  children,
  id,
}: {
  terbuka: boolean;
  onTutup: () => void;
  judul: ReactNode;
  keterangan?: ReactNode;
  children: ReactNode;
  id?: string;
}) {
  const lembar = useRef<HTMLDivElement>(null);
  const kepala = useRef<HTMLHeadingElement>(null);
  const pemicu = useRef<HTMLElement | null>(null);
  const tutup = useRef(onTutup);
  const idJudul = useId();

  useEffect(() => {
    tutup.current = onTutup;
  });

  useEffect(() => {
    if (!terbuka) return;
    pemicu.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    kepala.current?.focus({ preventScroll: true });

    const tekan = (e: KeyboardEvent) => {
      if (e.key === "Escape") tutup.current();
    };
    document.addEventListener("keydown", tekan);
    return () => {
      document.removeEventListener("keydown", tekan);
      const aktif = document.activeElement;
      if (aktif === document.body || lembar.current?.contains(aktif)) pemicu.current?.focus({ preventScroll: true });
    };
  }, [terbuka]);

  return (
    <div
      ref={lembar}
      id={id}
      className={s.lembar}
      role="dialog"
      aria-modal="false"
      aria-labelledby={idJudul}
      data-terbuka={terbuka || undefined}
      inert={!terbuka}
    >
      <span className={s.pegangan} aria-hidden="true" />
      <header className={s.kepala}>
        <div className={s.judulBlok}>
          <h2 id={idJudul} ref={kepala} tabIndex={-1} className={s.judul}>
            {judul}
          </h2>
          {keterangan && <p className={s.keterangan}>{keterangan}</p>}
        </div>
        <Tombol hanyaIkon ikon={X} onClick={() => tutup.current()}>
          Tutup
        </Tombol>
      </header>
      <div className={s.isi}>{children}</div>
    </div>
  );
}
