import type { LucideIcon } from "lucide-react";
import type { ButtonHTMLAttributes, ReactNode } from "react";
import { Ikon } from "./Ikon";
import s from "./tombol.module.css";

export type VarianTombol = "primer" | "sekunder";

/**
 * Kelas tombol untuk elemen lain (mis. Link Next) yang harus tampil sebagai tombol.
 * Hanya dua gaya: primer (satu per layar, aksi utama) dan sekunder.
 */
export function kelasTombol(varian: VarianTombol = "sekunder", hanyaIkon = false): string {
  return [s.tombol, s[varian], hanyaIkon ? s.hanyaIkon : ""].filter(Boolean).join(" ");
}

type Props = Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children"> & {
  varian?: VarianTombol;
  /** Ikon di depan label, 16 px. */
  ikon?: LucideIcon;
  /** Label tetap wajib; pada tombol ikon ia disembunyikan secara visual tapi dibaca. */
  children: ReactNode;
  hanyaIkon?: boolean;
  /** Sedang bekerja: label tetap, ikon diganti indikator, klik diabaikan. */
  sibuk?: boolean;
  /** Paksa tampilan keadaan untuk pelat referensi; tidak dipakai di layar produk. */
  paksa?: "hover" | "aktif" | "fokus";
};

export function Tombol({
  varian = "sekunder",
  ikon,
  children,
  hanyaIkon = false,
  sibuk = false,
  paksa,
  className,
  type = "button",
  onClick,
  ...sisa
}: Props) {
  return (
    <button
      {...sisa}
      type={type}
      className={[kelasTombol(varian, hanyaIkon), className].filter(Boolean).join(" ")}
      data-paksa={paksa}
      aria-busy={sibuk || undefined}
      aria-disabled={sibuk || undefined}
      onClick={sibuk ? undefined : onClick}
    >
      {sibuk ? (
        <span className={s.putar} aria-hidden="true" />
      ) : (
        ikon && <Ikon ikon={ikon} ukuran={hanyaIkon ? 20 : 16} />
      )}
      <span className={hanyaIkon ? s.tersembunyi : undefined}>{children}</span>
    </button>
  );
}
