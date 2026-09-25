import { TriangleAlert } from "lucide-react";
import { useId, type InputHTMLAttributes, type ReactNode } from "react";
import { Ikon } from "./Ikon";
import s from "./kolom.module.css";

/**
 * Kolom isian angka dengan satuan di dalam kotak. Nilai ditampilkan dalam
 * satuan yang dipahami orang (42 %, Rp 14,5 juta/kWp), bukan notasi mesin
 * (0,42). Pesan galat menyebut rentang yang diterima, bukan "input tidak valid".
 */
export function Kolom({
  label,
  satuan,
  petunjuk,
  galat,
  angka = true,
  paksa,
  id,
  ...sisa
}: Omit<InputHTMLAttributes<HTMLInputElement>, "size"> & {
  label: ReactNode;
  satuan?: string;
  petunjuk?: ReactNode;
  galat?: ReactNode;
  /** Nilai numerik: mono tabular + papan ketik desimal. */
  angka?: boolean;
  /** Paksa tampilan keadaan untuk pelat referensi. */
  paksa?: "hover" | "fokus";
}) {
  const otomatis = useId();
  const idKolom = id ?? otomatis;
  const idKet = `${idKolom}-ket`;
  const idGalat = `${idKolom}-galat`;
  // Galat menggantikan petunjuk di tempat yang sama agar tata letak tidak melompat.
  const dijelaskan = galat ? idGalat : petunjuk ? idKet : undefined;

  return (
    <div className={s.kolom} data-galat={galat ? "" : undefined} data-mati={sisa.disabled || undefined}>
      <label className={s.label} htmlFor={idKolom}>
        {label}
      </label>
      <div className={s.kotak} data-paksa={paksa}>
        <input
          {...sisa}
          id={idKolom}
          className={s.masukan}
          data-angka={angka || undefined}
          inputMode={angka ? "decimal" : sisa.inputMode}
          autoComplete={sisa.autoComplete ?? "off"}
          aria-invalid={galat ? true : undefined}
          aria-describedby={dijelaskan}
        />
        {satuan && (
          <span className={s.satuan} aria-hidden="true">
            {satuan}
          </span>
        )}
      </div>
      {galat ? (
        <p className={s.galat} id={idGalat}>
          <Ikon ikon={TriangleAlert} className={s.galatIkon} />
          {galat}
        </p>
      ) : (
        petunjuk && (
          <p className={s.petunjuk} id={idKet}>
            {petunjuk}
          </p>
        )
      )}
    </div>
  );
}
