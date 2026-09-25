import type { LucideIcon } from "lucide-react";
import type { CSSProperties, ReactNode } from "react";
import { Ikon } from "./Ikon";
import s from "./keadaan.module.css";

/**
 * Keadaan kosong, galat, dan luring. Rata kiri, satu kalimat penyebab, satu
 * aksi. Galat menyebut apa yang masih bisa dipakai, bukan hanya apa yang gagal.
 * Pembungkus live region (role="status"/"alert") dipasang oleh layar yang
 * memunculkannya secara dinamis.
 */
export function Keadaan({
  nada = "kosong",
  ikon,
  judul,
  children,
  aksi,
}: {
  nada?: "kosong" | "galat" | "luring";
  ikon: LucideIcon;
  judul: ReactNode;
  children?: ReactNode;
  aksi?: ReactNode;
}) {
  return (
    <div className={s.keadaan} data-nada={nada}>
      <Ikon ikon={ikon} ukuran={20} className={s.ikon} />
      <div className={s.isi}>
        <p className={s.judul}>{judul}</p>
        {children && <p className={s.teks}>{children}</p>}
        {aksi && <div className={s.aksi}>{aksi}</div>}
      </div>
    </div>
  );
}

/**
 * Kerangka memuat: blok diam seukuran konten yang akan datang (tanpa kilau
 * bergerak). Ukur dari konten sebenarnya agar tata letak tidak melompat.
 */
export function Kerangka({
  lebar = "100%",
  tinggi = 16,
  gaya,
}: {
  lebar?: number | string;
  tinggi?: number | string;
  gaya?: CSSProperties;
}) {
  return <span className={s.kerangka} style={{ width: lebar, height: tinggi, ...gaya }} aria-hidden="true" />;
}
