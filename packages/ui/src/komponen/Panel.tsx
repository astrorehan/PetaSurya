import type { LucideIcon } from "lucide-react";
import type { HTMLAttributes, ReactNode } from "react";
import { Ikon } from "./Ikon";
import s from "./panel.module.css";

/**
 * Permukaan satu tingkat di atas --paper. Tidak pernah bersarang di Panel
 * lain: pengelompokan di dalam panel memakai garis --line dan jarak.
 * `rendah` = keyakinan rendah: seluruh panel diwarnai, bukan hanya lencana.
 */
export function Panel({
  children,
  rendah = false,
  as: Tag = "section",
  className,
  ...sisa
}: HTMLAttributes<HTMLElement> & { rendah?: boolean; as?: "section" | "div" | "article" | "aside" }) {
  return (
    <Tag {...sisa} className={[s.panel, className].filter(Boolean).join(" ")} data-rendah={rendah || undefined}>
      {children}
    </Tag>
  );
}

/**
 * Pita peringatan selebar panel. Latar arsir miring 8 px sama dengan arsir
 * peta untuk keyakinan rendah, sehingga keduanya terbaca sebagai satu tanda.
 */
export function Pita({
  ikon,
  judul,
  children,
  aksi,
}: {
  ikon: LucideIcon;
  judul: ReactNode;
  children?: ReactNode;
  aksi?: ReactNode;
}) {
  return (
    <div className={s.pita} role="note">
      <Ikon ikon={ikon} className={s.pitaIkon} />
      <div className={s.pitaIsi}>
        <p className={s.pitaJudul}>{judul}</p>
        {children && <p className={s.pitaTeks}>{children}</p>}
      </div>
      {aksi && <div className={s.pitaAksi}>{aksi}</div>}
    </div>
  );
}
