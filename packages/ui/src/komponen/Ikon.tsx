import type { LucideIcon } from "lucide-react";

/*
 * Semua ikon lewat sini agar satu gaya: Lucide, garis 1,75, ukuran 16
 * (sebaris teks ≤ 15 px) atau 20 (tombol ikon, keadaan kosong/galat).
 * Ikon dekoratif (bawaan) disembunyikan dari pembaca layar; beri `label`
 * hanya bila ikon berdiri sendiri sebagai informasi.
 */
export function Ikon({
  ikon: Gambar,
  ukuran = 16,
  label,
  className,
}: {
  ikon: LucideIcon;
  ukuran?: 16 | 20;
  label?: string;
  className?: string;
}) {
  return (
    <Gambar
      size={ukuran}
      strokeWidth={1.75}
      className={className}
      focusable="false"
      role={label ? "img" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
    />
  );
}
