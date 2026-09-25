import { Bagian } from "./Lembar";
import s from "./prinsip.module.css";

/* Urutan = prioritas: bila dua prinsip bertabrakan, yang lebih atas menang. */
const PRINSIP = [
  {
    judul: "Angka lebih dulu",
    isi: "Hemat per tahun dan balik modal terbaca tanpa menggulir. Peta memberi konteks, bukan jawaban.",
  },
  {
    judul: "Jujur soal batas",
    isi: "Balik modal di atas umur sistem ditulis dengan kata. Keyakinan rendah mewarnai seluruh panel.",
  },
  {
    judul: "Setiap angka bisa ditelusuri",
    isi: "Satuan selalu tampil. Presisi penuh saat disorot, rumus dan sumbernya satu ketukan.",
  },
  {
    judul: "Instrumen ukur, bukan brosur",
    isi: "Rapat, rata kiri, garis tipis. Padding 12–16 px; ruang kosong harus punya tugas.",
  },
  {
    judul: "Dua aksen, satu arti",
    isi: "Surya untuk energi, daun untuk uang dan CO₂. Pri hanya aksi, merah hanya peringatan.",
  },
  {
    judul: "Tenang saat berubah",
    isi: "Angka lama meredup saat dihitung ulang. Gerak hanya untuk sentuhan, keadaan, dan peta.",
  },
] as const;

export function BagianPrinsip() {
  return (
    <Bagian
      id="prinsip"
      nomor="01"
      judul="Prinsip"
      aturan="Enam aturan yang memutus perdebatan desain. Kalau dua aturan bertabrakan, yang lebih atas menang."
    >
      <ol className={s.prinsip}>
        {PRINSIP.map((p, i) => (
          <li key={p.judul} className={s.butir}>
            <span className={s.nomor}>1.{i + 1}</span>
            <h3 className={s.judul}>{p.judul}</h3>
            <p className={s.isi}>{p.isi}</p>
          </li>
        ))}
      </ol>
    </Bagian>
  );
}
