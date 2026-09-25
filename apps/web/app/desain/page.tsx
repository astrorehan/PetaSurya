import type { Metadata } from "next";
import { Lencana, Logo, TAGLINE } from "@petasurya/ui";
import { BagianAngka } from "./_bagian/BagianAngka";
import { BagianBentuk } from "./_bagian/BagianBentuk";
import { BagianHuruf } from "./_bagian/BagianHuruf";
import { BagianIkonGerak } from "./_bagian/BagianIkonGerak";
import { BagianKontrol } from "./_bagian/BagianKontrol";
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
  { id: "prinsip", nomor: "01", judul: "Prinsip" },
  { id: "warna", nomor: "02", judul: "Warna" },
  { id: "huruf", nomor: "03", judul: "Huruf" },
  { id: "angka", nomor: "04", judul: "Angka" },
  { id: "ruang", nomor: "05", judul: "Ruang" },
  { id: "bentuk", nomor: "06", judul: "Bentuk" },
  { id: "ikon-gerak", nomor: "07", judul: "Ikon & gerak" },
  { id: "kontrol", nomor: "08", judul: "Kontrol" },
];

export default function ReferensiDesain() {
  return (
    <main className={s.lembar}>
      <header className={s.kepalaLembar}>
        <div className={s.judulBlok}>
          <p className={s.kodeLembar}>PS-RD-01 · Lembar referensi</p>
          <h1 className={s.judulLembar}>Referensi desain</h1>
          <p className={s.pengantar}>
            Satu lembar yang dirujuk setiap layar PetaSurya. Token, komponen, dan aturan angka di sini dirender dari
            kode yang sama dengan produk. Kalau layar berbeda dari lembar ini, layarnya yang diperbaiki.
          </p>
        </div>
        <dl className={s.blokJudul}>
          <div className={s.merek}>
            <Logo size={40} label="" />
            <span className={s.merekTeks}>
              <span className={s.merekNama}>PetaSurya</span>
              <span className={s.merekTagline}>{TAGLINE}</span>
            </span>
          </div>
          <div className={s.sel}>
            <dt>No. lembar</dt>
            <dd className="num">PS-RD-01</dd>
          </div>
          <div className={s.sel}>
            <dt>Revisi</dt>
            <dd>A · 25 September 2026</dd>
          </div>
          <div className={s.sel} data-lebar="">
            <dt>Berlaku untuk</dt>
            <dd>6 rute · 2 tema · 360–1.440 px</dd>
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
        </div>
      </div>
    </main>
  );
}
