import type { ButtonHTMLAttributes, ReactNode } from "react";
import { Sigma } from "lucide-react";
import { pecahAngka, ucapan } from "../format";
import { Ikon } from "./Ikon";
import s from "./angka.module.css";

export type Aksen = "surya" | "daun";

/** Label kecil kapital di atas angka dan judul kelompok data. */
export function Label({ children, aksen, as: Tag = "p" }: { children: ReactNode; aksen?: Aksen; as?: "p" | "span" | "h3" | "h4" | "dt" }) {
  return (
    <Tag className={s.label}>
      {aksen && <span className={s.kunci} data-aksen={aksen} aria-hidden="true" />}
      {children}
    </Tag>
  );
}

/**
 * Angka hasil. `display` hanya satu per layar (jawaban), `figure` untuk
 * pendamping. Satuan diset lebih kecil dari angkanya; angka memakai Archivo,
 * yang digitnya sudah hampir sama lebar. Saat `menghitung`, angka lama
 * meredup, tidak hilang.
 */
export function Angka({
  label,
  nilai,
  lengkap,
  ukuran = "figure",
  keterangan,
  jejak,
  menghitung = false,
  aksen,
  ucap,
}: {
  label: ReactNode;
  /** Sudah terformat, mis. rupiah(n, true) → "Rp 12,1 juta". */
  nilai: string;
  /** Presisi penuh, tampil saat diarahkan kursor: "Rp 12.118.000". */
  lengkap?: string;
  ukuran?: "display" | "figure";
  keterangan?: ReactNode;
  jejak?: ReactNode;
  menghitung?: boolean;
  aksen?: Aksen;
  /** Bacaan pembaca layar; bawaan ucapan(nilai). */
  ucap?: string;
}) {
  const { awal, angka, akhir } = pecahAngka(nilai);
  return (
    <div className={s.angka} data-ukuran={ukuran} data-menghitung={menghitung || undefined} aria-busy={menghitung || undefined}>
      <Label aksen={aksen}>{label}</Label>
      <p className={s.nilai} title={lengkap}>
        <span className={s.sr}>{ucap ?? ucapan(nilai)}</span>
        <span aria-hidden="true">
          {awal && <span className={s.awal}>{awal}</span>}
          <span className={s.inti}>{angka}</span>
          {akhir && <span className={s.akhir}>{akhir}</span>}
        </span>
      </p>
      {keterangan && <p className={s.keterangan}>{keterangan}</p>}
      {jejak}
    </div>
  );
}

/**
 * Baris data berlabel ala lembar data: label kiri, nilai mono rata kanan.
 * Untuk rincian (NPV, IRR, LCOE, luas, tilt) — bukan untuk angka jawaban.
 */
export function DaftarData({
  baris,
  menghitung = false,
}: {
  baris: { label: ReactNode; nilai: string; lengkap?: string; ucap?: string; catatan?: ReactNode }[];
  menghitung?: boolean;
}) {
  return (
    <dl className={s.daftar} data-menghitung={menghitung || undefined}>
      {baris.map((b, i) => (
        <div key={i} className={s.baris}>
          <dt>{b.label}</dt>
          <dd title={b.lengkap}>
            <span className={s.sr}>{b.ucap ?? ucapan(b.nilai)}</span>
            <span aria-hidden="true" className={s.nilaiData}>
              {b.nilai}
            </span>
            {b.catatan && <span className={s.catatanData}>{b.catatan}</span>}
          </dd>
        </div>
      ))}
    </dl>
  );
}

/** Tautan ke jejak hitungan sebuah angka. Membuka lembar samping jejak. */
export function JejakTautan({
  children = "Jejak hitungan",
  ...sisa
}: Omit<ButtonHTMLAttributes<HTMLButtonElement>, "type">) {
  return (
    <button type="button" className={s.jejak} aria-haspopup="dialog" {...sisa}>
      <Ikon ikon={Sigma} />
      <span>{children}</span>
    </button>
  );
}
