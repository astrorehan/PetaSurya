"use client";

import { useId, type ReactNode } from "react";
import s from "./kreatif.module.css";

/** Radio asli mempertahankan validasi formulir, pilihan tunggal, dan navigasi panah. */
export function PilihanKartu<T extends string>({ label, nama, pilihan, nilai, bawaan, onUbah, wajib = false, nonaktif = false }: {
  label: string;
  nama: string;
  pilihan: readonly { nilai: T; label: string; rincian?: ReactNode; nonaktif?: boolean; alasan?: string }[];
  nilai?: T;
  bawaan?: T;
  onUbah?: (nilai: T) => void;
  wajib?: boolean;
  nonaktif?: boolean;
}) {
  const id = useId();
  return (
    <fieldset className={s.pilihan} disabled={nonaktif}>
      <legend className={s.label}>{label}</legend>
      <div className={s.daftarPilihan}>
        {pilihan.map((p, i) => (
          <label key={p.nilai} className={s.kartu}>
            <input type="radio" name={nama} value={p.nilai} disabled={p.nonaktif} required={wajib}
              aria-labelledby={`${id}-${i}-label`}
              aria-describedby={p.rincian || p.alasan ? `${id}-${i}` : undefined}
              {...(nilai !== undefined ? { checked: nilai === p.nilai } : { defaultChecked: bawaan === p.nilai })}
              onChange={() => onUbah?.(p.nilai)} />
            <span className={s.isiKartu}>
              <strong id={`${id}-${i}-label`}>{p.label}</strong>
              {(p.rincian || p.alasan) && <span id={`${id}-${i}`} className={s.ringkasan}>{p.nonaktif && p.alasan ? p.alasan : p.rincian}</span>}
            </span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}
