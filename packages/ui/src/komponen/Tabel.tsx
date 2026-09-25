import type { ReactNode } from "react";
import s from "./tabel.module.css";

/**
 * Tabel data. Sel angka diberi atribut `data-angka` pada <th>/<td>:
 * rata kanan, Plex Mono, tabular-nums. Satuan ditulis di kepala kolom,
 * bukan diulang di setiap sel. `gulir` = boleh menggulir mendatar di layar
 * sempit; wadahnya lalu bisa difokus agar tergulir dengan papan ketik.
 */
export function Tabel({
  judul,
  children,
  gulir = false,
  catatan,
}: {
  judul: ReactNode;
  children: ReactNode;
  gulir?: boolean;
  catatan?: ReactNode;
}) {
  return (
    <div className={s.bungkus}>
      <div
        className={s.gulir}
        data-gulir={gulir || undefined}
        {...(gulir ? { role: "region", tabIndex: 0, "aria-label": typeof judul === "string" ? judul : undefined } : {})}
      >
        <table className={s.tabel}>
          <caption className={s.judul}>{judul}</caption>
          {children}
        </table>
      </div>
      {catatan && <p className={s.catatan}>{catatan}</p>}
    </div>
  );
}
