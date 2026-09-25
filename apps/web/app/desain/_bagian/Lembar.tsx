import { Check, X } from "lucide-react";
import type { CSSProperties, ReactNode } from "react";
import { Ikon } from "@petasurya/ui";
import s from "../desain.module.css";

/*
 * Perangkat lembar: bagian bernomor, pelat bergambar (Gbr. n.m), pasangan
 * Ya/Jangan, dan garis ukur. Hanya dipakai di /desain.
 */

export function Bagian({
  id,
  nomor,
  judul,
  aturan,
  children,
}: {
  id: string;
  nomor: string;
  judul: string;
  aturan?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section id={id} className={s.bagian} aria-labelledby={`${id}-judul`}>
      <header className={s.kepalaBagian}>
        <span className={s.nomorBagian} aria-hidden="true">
          {nomor}
        </span>
        <h2 id={`${id}-judul`} className={s.judulBagian}>
          {judul}
        </h2>
        {aturan && <p className={s.aturan}>{aturan}</p>}
      </header>
      {children}
    </section>
  );
}

/** Deret pelat. `kolom` = jumlah kolom saat wadah cukup lebar. */
export function Deret({ kolom = 1, children }: { kolom?: 1 | 2 | 3; children: ReactNode }) {
  return (
    <div className={s.deret} data-kolom={kolom}>
      {children}
    </div>
  );
}

/**
 * Pelat: panggung + keterangan "Gbr. n.m". `statis` = gambar komponen, bukan
 * kontrol yang bisa dipakai (inert: tidak terjangkau Tab, tidak dibaca);
 * keterangannya yang menjelaskan isi. `kisi` = latar titik 8 px untuk pelat ukur.
 */
export function Pelat({
  nomor,
  judul,
  keterangan,
  children,
  kisi = false,
  statis = false,
  polos = false,
  gulir = false,
}: {
  nomor: string;
  judul: ReactNode;
  keterangan?: ReactNode;
  children: ReactNode;
  kisi?: boolean;
  statis?: boolean;
  /** Tanpa bingkai: untuk tabel dan daftar yang sudah punya garisnya sendiri. */
  polos?: boolean;
  gulir?: boolean;
}) {
  return (
    <figure className={s.pelat}>
      <div
        className={s.panggung}
        data-kisi={kisi || undefined}
        data-polos={polos || undefined}
        data-gulir={gulir || undefined}
        inert={statis || undefined}
      >
        {children}
      </div>
      <figcaption className={s.keteranganPelat}>
        <span className={s.gbr}>Gbr. {nomor}</span>
        <span className={s.judulPelat}>{judul}</span>
        {keterangan && <span className={s.teksPelat}>{keterangan}</span>}
      </figcaption>
    </figure>
  );
}

type Putusan = { contoh: ReactNode; alasan: ReactNode };

/** Pasangan contoh benar dan salah. Vonis selalu ikon + kata, bukan warna saja. */
export function YaJangan({ ya, jangan }: { ya: Putusan; jangan: Putusan }) {
  return (
    <div className={s.yaJangan}>
      <Vonis jenis="ya" {...ya} />
      <Vonis jenis="jangan" {...jangan} />
    </div>
  );
}

function Vonis({ jenis, contoh, alasan }: Putusan & { jenis: "ya" | "jangan" }) {
  return (
    <figure className={s.putusan} data-jenis={jenis}>
      <div className={s.vonis}>
        <Ikon ikon={jenis === "ya" ? Check : X} className={s.vonisIkon} />
        {jenis === "ya" ? "Ya" : "Jangan"}
      </div>
      <div className={s.panggung} inert>
        {contoh}
      </div>
      <figcaption className={s.alasan}>{alasan}</figcaption>
    </figure>
  );
}

/**
 * Garis ukur ala gambar teknik: garis --busbar berujung tegak, angka mono
 * --ink-2. Diposisikan absolut terhadap pembungkus relatif.
 */
export function Ukur({
  arah = "h",
  label,
  luar,
  gaya,
}: {
  arah?: "h" | "v";
  label: string;
  /** Label di luar garis (untuk ukuran pendek). */
  luar?: "atas" | "bawah" | "kiri" | "kanan";
  gaya: CSSProperties;
}) {
  return (
    <span className={s.ukur} data-arah={arah} data-luar={luar} style={gaya} aria-hidden="true">
      <span className={s.ukurLabel}>{label}</span>
    </span>
  );
}

/** Penanda bernomor untuk anatomi. */
export function Penanda({ children }: { children: ReactNode }) {
  return (
    <span className={s.penanda} aria-hidden="true">
      {children}
    </span>
  );
}

/** Nama token atau berkas dalam kalimat. */
export function Kode({ children }: { children: ReactNode }) {
  return <code className={s.kode}>{children}</code>;
}

/** Daftar aturan pendek: satu kalimat per butir. */
export function DaftarAturan({ butir }: { butir: ReactNode[] }) {
  return (
    <ul className={s.daftarAturan}>
      {butir.map((b, i) => (
        <li key={i}>{b}</li>
      ))}
    </ul>
  );
}
