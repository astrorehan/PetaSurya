"use client";

import { useId, useRef, useState, type ReactNode } from "react";
import { ChevronDown } from "lucide-react";
import { Ikon } from "./Ikon";
import s from "./kreatif.module.css";

/** Rincian tetap terpasang saat dilipat; inert mengeluarkan isinya dari urutan fokus. */
export function PanelLipat({ judul, ringkasan, children, terbukaAwal = false }: {
  judul: string;
  ringkasan?: ReactNode;
  children: ReactNode;
  terbukaAwal?: boolean;
}) {
  const [terbuka, setTerbuka] = useState(terbukaAwal);
  const id = useId();
  const tombol = useRef<HTMLButtonElement>(null);
  return (
    <section className={s.panel} data-terbuka={terbuka} onKeyDown={(event) => {
      if (event.key === "Escape" && terbuka) {
        event.preventDefault();
        setTerbuka(false);
        tombol.current?.focus();
      }
    }}>
      <button ref={tombol} className={s.pemicu} type="button" aria-expanded={terbuka} aria-controls={id} onClick={() => setTerbuka(!terbuka)}>
        <span><strong>{judul}</strong>{ringkasan && <span className={s.ringkasan}>{ringkasan}</span>}</span>
        <Ikon ikon={ChevronDown} className={s.panah} />
      </button>
      <div id={id} className={s.lipatan} inert={!terbuka} aria-hidden={!terbuka}>
        <div className={s.lipatanDalam}><div className={s.isiPanel}>{children}</div></div>
      </div>
    </section>
  );
}
