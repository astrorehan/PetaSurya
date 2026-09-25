import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { Ikon } from "./Ikon";
import s from "./lencana.module.css";

export type Nada = "netral" | "pri" | "surya" | "daun" | "merah";

/**
 * Lencana status. Teks selalu --ink (kontras ≥ 4,5 di atas latar --*-bg);
 * warna semantik hanya di ikon dan latar. `contoh` = garis putus-putus untuk
 * data contoh yang belum hasil hitungan.
 */
export function Lencana({
  children,
  nada = "netral",
  ikon,
  contoh = false,
}: {
  children: ReactNode;
  nada?: Nada;
  ikon?: LucideIcon;
  contoh?: boolean;
}) {
  return (
    <span className={s.lencana} data-nada={nada} data-contoh={contoh || undefined}>
      {ikon && <Ikon ikon={ikon} className={s.ikon} />}
      {children}
    </span>
  );
}
