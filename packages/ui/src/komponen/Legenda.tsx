import { SKALA_KWP } from "../skalaPeta";
import s from "./legenda.module.css";

/**
 * Legenda peta potensi: lima kelas amber (lebih terang = lebih banyak
 * energi), arsir untuk keyakinan rendah, garis untuk bangunan terpilih.
 * Batas kelas ditulis di tepi kiri kelasnya.
 */
export function Legenda({ ringkas = false }: { ringkas?: boolean }) {
  return (
    <div className={s.legenda} data-ringkas={ringkas || undefined}>
      <p className={s.judul}>
        Potensi atap <span>(kWp)</span>
      </p>
      <ol className={s.skala} aria-label="Kelas potensi">
        {SKALA_KWP.map((k, i) => {
          const berikut = SKALA_KWP[i + 1];
          return (
            <li key={k.batas} aria-label={berikut ? `${k.batas} sampai ${berikut.batas} kilowatt-peak` : `${k.batas} kilowatt-peak atau lebih`}>
              <span className={s.kelas} style={{ background: k.warna }} />
              <span className={s.batas}>{berikut ? k.batas : `${k.batas}+`}</span>
            </li>
          );
        })}
      </ol>
      {!ringkas && (
        <ul className={s.lain}>
          <li>
            <span className={s.arsir} aria-hidden="true" />
            Keyakinan rendah
          </li>
          <li>
            <span className={s.terpilih} aria-hidden="true" />
            Terpilih
          </li>
        </ul>
      )}
    </div>
  );
}
