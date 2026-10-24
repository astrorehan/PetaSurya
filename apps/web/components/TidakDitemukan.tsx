import Link from "next/link";
import { ArrowUpRight, MapPin } from "lucide-react";
import { kelasTombol } from "@petasurya/ui";
import s from "./statusHalaman.module.css";

export function TidakDitemukan() {
  return (
    <main className={s.halaman}>
      <div className={s.ikon} aria-hidden="true"><MapPin size={36} strokeWidth={1.4} /></div>
      <p className={s.label}>404 · HALAMAN TIDAK DITEMUKAN</p>
      <h1 className={s.judul}>Mari kembali ke peta.</h1>
      <p className={s.teks}>Alamat halaman mungkin berubah atau tautannya tidak lengkap. Temukan bangunan Anda melalui peta.</p>
      <div className={s.aksi}>
        <Link href="/peta" className={kelasTombol("primer")}>Buka peta <ArrowUpRight size={16} aria-hidden="true" /></Link>
        <Link href="/" className={kelasTombol("sekunder")}>Ke beranda</Link>
      </div>
    </main>
  );
}
