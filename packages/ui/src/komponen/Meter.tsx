import { TriangleAlert } from "lucide-react";
import type { ReactNode } from "react";
import { tahun as fmtTahun } from "../format";
import { Label } from "./Angka";
import { Ikon } from "./Ikon";
import s from "./meter.module.css";

const ID = "id-ID";
const satuDesimal = (n: number) => n.toLocaleString(ID, { maximumFractionDigits: 1 });

/**
 * Garis waktu balik modal 0 → umur sistem. Bagian sebelum titik balik modal
 * netral (modal sedang kembali); sesudahnya --daun (tahun hemat bersih).
 * Payback di atas umur sistem tidak digambar sebagai titik: tidak ada titiknya.
 */
export function MeterPayback({
  tahun,
  umur = 25,
  menghitung = false,
}: {
  tahun: number | null;
  umur?: number;
  menghitung?: boolean;
}) {
  const layak = tahun !== null && tahun <= umur;
  const posisi = layak ? (tahun / umur) * 100 : 100;
  const sisa = layak ? umur - tahun : 0;
  const skala = Array.from({ length: Math.floor(umur / 5) + 1 }, (_, i) => i * 5);
  const bacaan = layak
    ? `Balik modal di tahun ke-${satuDesimal(tahun)} dari umur sistem ${umur} tahun; ${satuDesimal(sisa)} tahun hemat bersih sesudahnya.`
    : `Balik modal ${fmtTahun(tahun ?? Infinity)}: modal tidak kembali dalam umur sistem ${umur} tahun.`;

  return (
    <div className={s.payback} data-menghitung={menghitung || undefined} aria-busy={menghitung || undefined}>
      <div className={s.kepala}>
        <Label aksen="daun">Balik modal</Label>
        <p className={s.ringkas} aria-hidden="true">
          {layak ? (
            <>
              tahun ke-<b className="num">{satuDesimal(tahun)}</b> dari {umur}
            </>
          ) : (
            <b>{fmtTahun(tahun ?? Infinity)}</b>
          )}
        </p>
      </div>
      <div className={s.rel} role="img" aria-label={bacaan}>
        <span className={s.modal} style={{ width: `${posisi}%` }} data-penuh={!layak || undefined} />
        {layak && sisa > 0 && <span className={s.untung} style={{ left: `${posisi}%` }} />}
        {layak && <span className={s.penanda} style={{ left: `${posisi}%` }} />}
      </div>
      <div className={s.skala} aria-hidden="true">
        {skala.map((t) => (
          <span key={t} style={{ left: `${(t / umur) * 100}%` }}>
            {t}
          </span>
        ))}
      </div>
      <p className={s.keterangan}>
        {layak ? (
          <>Sisa umur sesudah modal kembali: {satuDesimal(sisa)} tahun.</>
        ) : (
          <>
            <Ikon ikon={TriangleAlert} className={s.ikonMerah} />
            Modal tidak kembali dalam umur sistem {umur} tahun.
          </>
        )}
      </p>
    </div>
  );
}

export type TingkatKeyakinan = "tinggi" | "sedang" | "rendah";

/** Ambang cetak biru L2: ≥ 0,70 tinggi; < 0,45 memakai jalur mundur jejak bangunan. */
export function tingkatKeyakinan(nilai: number): TingkatKeyakinan {
  return nilai >= 0.7 ? "tinggi" : nilai >= 0.45 ? "sedang" : "rendah";
}

/**
 * Keyakinan analisis atap: tiga batang sinyal + kata + angka. Tidak pernah
 * hanya warna; hanya tingkat rendah yang memakai --merah.
 */
export function MeterKeyakinan({ nilai, alasan }: { nilai: number; alasan?: ReactNode }) {
  const tingkat = tingkatKeyakinan(nilai);
  const isi = tingkat === "tinggi" ? 3 : tingkat === "sedang" ? 2 : 1;
  const angka = nilai.toLocaleString(ID, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return (
    <div className={s.keyakinan} data-tingkat={tingkat}>
      <div
        className={s.baris}
        role="meter"
        aria-label="Keyakinan analisis atap"
        aria-valuemin={0}
        aria-valuemax={1}
        aria-valuenow={nilai}
        aria-valuetext={`${tingkat}, ${angka}`}
      >
        <span className={s.sinyal} aria-hidden="true">
          {[1, 2, 3].map((i) => (
            <i key={i} data-isi={i <= isi || undefined} />
          ))}
        </span>
        <span className={s.kata}>
          Keyakinan <b>{tingkat}</b>
        </span>
        <span className={`${s.skor} num`}>{angka}</span>
      </div>
      {alasan && <p className={s.alasan}>{alasan}</p>}
    </div>
  );
}
