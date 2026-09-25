import type { ReactNode } from "react";
import s from "./segmen.module.css";

/**
 * Pilihan tunggal 2–4 opsi yang saling eksklusif (golongan, peta dasar, tema).
 * Dibangun dari radio asli: panah kiri/kanan dan Tab bekerja tanpa skrip.
 * Terkendali bila `nilai` + `onUbah` diberikan; tanpa keduanya memakai `bawaan`.
 */
export function Segmen<T extends string>({
  label,
  nama,
  pilihan,
  nilai,
  bawaan,
  onUbah,
  sembunyikanLabel = false,
}: {
  label: ReactNode;
  nama: string;
  pilihan: readonly { nilai: T; label: ReactNode }[];
  nilai?: T;
  bawaan?: T;
  onUbah?: (nilai: T) => void;
  sembunyikanLabel?: boolean;
}) {
  const terkendali = nilai !== undefined;
  return (
    <fieldset className={s.segmen}>
      <legend className={sembunyikanLabel ? s.tersembunyi : s.label}>{label}</legend>
      <div className={s.rel}>
        {pilihan.map((p) => (
          <label key={p.nilai} className={s.opsi}>
            <input
              type="radio"
              name={nama}
              value={p.nilai}
              className={s.radio}
              {...(terkendali
                ? { checked: nilai === p.nilai, onChange: () => onUbah?.(p.nilai) }
                : { defaultChecked: bawaan === p.nilai, onChange: onUbah ? () => onUbah(p.nilai) : undefined })}
            />
            <span className={s.teks}>{p.label}</span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}
