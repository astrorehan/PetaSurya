import type { Metadata } from "next";
import { ChevronDown } from "lucide-react";
import { Ikon, Lencana } from "@petasurya/ui";
import { BagianAngka } from "./_bagian/BagianAngka";
import { BagianBentuk } from "./_bagian/BagianBentuk";
import { BagianHuruf } from "./_bagian/BagianHuruf";
import { BagianIkonGerak } from "./_bagian/BagianIkonGerak";
import { BagianKontrol } from "./_bagian/BagianKontrol";
import { BagianKreatif } from "./_bagian/BagianKreatif";
import { BagianPrinsip } from "./_bagian/BagianPrinsip";
import { BagianRuang } from "./_bagian/BagianRuang";
import { BagianWarna } from "./_bagian/BagianWarna";
import { DaftarIsi, type ButirIsi } from "./_bagian/DaftarIsi";
import { Kode } from "./_bagian/Lembar";
import { toko } from "./_data";
import s from "./desain.module.css";

export const metadata: Metadata = {
  title: "Referensi desain",
  description: "Token, komponen, dan aturan angka PetaSurya dalam satu lembar.",
};

const ISI: readonly ButirIsi[] = [
  { id: "prinsip", nomor: "01", judul: "Prinsip & UX" },
  { id: "warna", nomor: "02", judul: "Warna" },
  { id: "huruf", nomor: "03", judul: "Huruf" },
  { id: "angka", nomor: "04", judul: "Angka" },
  { id: "ruang", nomor: "05", judul: "Ruang" },
  { id: "bentuk", nomor: "06", judul: "Bentuk" },
  { id: "ikon-gerak", nomor: "07", judul: "Ikon & gerak" },
  { id: "kontrol", nomor: "08", judul: "Kontrol" },
  { id: "kreatif", nomor: "09", judul: "Komponen kreatif" },
];

export default function ReferensiDesain() {
  return (
    <main className={s.lembar}>
      <header className={s.kepalaLembar}>
        <div className={s.judulBlok}>
          <p className={s.kodeLembar}>PetaSurya · Sistem desain</p>
          <h1 className={s.judulLembar}>Referensi desain</h1>
          <p className={s.pengantar}>
            Aturan dan komponen untuk antarmuka yang jelas, ringkas, dan mudah digunakan.
          </p>
        </div>
        <details className={s.detailReferensi}>
          <summary>Detail referensi <Ikon ikon={ChevronDown} /></summary>
          <dl className={s.blokJudul}>
            <div className={s.sel}>
              <dt>No. lembar</dt>
              <dd className="num">PS-RD-01</dd>
            </div>
            <div className={s.sel}>
              <dt>Revisi</dt>
              <dd>C · 13 Oktober 2026</dd>
            </div>
            <div className={s.sel} data-lebar="">
              <dt>Berlaku untuk</dt>
              <dd>Seluruh antarmuka · 2 tema · 360–1.440 px</dd>
            </div>
            <div className={s.sel} data-lebar="">
              <dt>Data contoh</dt>
              <dd>
                {toko.bangunan.nama}, <Kode>{toko.bangunan.source_ref}</Kode>
                <Lencana contoh>Contoh</Lencana>
              </dd>
            </div>
            <div className={s.sel}>
              <dt>Token</dt>
              <dd>
                <Kode>packages/ui/src/tokens.css</Kode>
              </dd>
            </div>
            <div className={s.sel}>
              <dt>Komponen</dt>
              <dd>
                <Kode>packages/ui/src/komponen</Kode>
              </dd>
            </div>
          </dl>
        </details>
      </header>

      <div className={s.tata}>
        <DaftarIsi butir={ISI} />
        <div className={s.isi}>
          <BagianPrinsip />
          <BagianWarna />
          <BagianHuruf />
          <BagianAngka />
          <BagianRuang />
          <BagianBentuk />
          <BagianIkonGerak />
          <BagianKontrol />
          <BagianKreatif />
        </div>
      </div>
    </main>
  );
}
