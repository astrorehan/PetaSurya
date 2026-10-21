import { Bagian } from "./Lembar";
import { DemoInformasi } from "./DemoInformasi";
import s from "./prinsip.module.css";

/* Urutan = prioritas: bila dua prinsip bertabrakan, yang lebih atas menang. */
const PRINSIP = [
  {
    judul: "Jawaban lebih dulu",
    isi: "Hasil atau aksi berikutnya terlihat tanpa paragraf pembuka.",
  },
  {
    judul: "Teks punya tugas",
    isi: "Hapus kalimat yang tidak membantu tindakan, keputusan, atau pemahaman hasil.",
  },
  {
    judul: "Rincian saat diperlukan",
    isi: "Rumus dan sumber bisa dibuka. Satuan, galat, dan penanda contoh tetap terlihat.",
  },
  {
    judul: "Ikon yang dipahami",
    isi: "Tutup, cari, menu, tema boleh berupa ikon. Aksi domain tetap berlabel.",
  },
  {
    judul: "Jujur soal batas",
    isi: "Data contoh dan keyakinan rendah harus dikenali sebelum pengguna mengambil keputusan.",
  },
  {
    judul: "Ruang untuk memahami",
    isi: "Kelompokkan dengan jarak dan hierarki. Ruang kosong tidak harus diisi teks.",
  },
] as const;

export function BagianPrinsip() {
  return (
    <Bagian
      id="prinsip"
      nomor="01"
      judul="Prinsip & UX"
    >
      <div className={s.aturanUtama}>
        <p className={s.pernyataan}>Tidak semua elemen perlu teks.</p>
        <p className={s.ujian}>Jika dihapus dan pengguna tetap paham, hapus.</p>
      </div>
      <ol className={s.prinsip}>
        {PRINSIP.map((p, i) => (
          <li key={p.judul} className={s.butir}>
            <span className={s.nomor}>1.{i + 1}</span>
            <h3 className={s.judul}>{p.judul}</h3>
            <p className={s.isi}>{p.isi}</p>
          </li>
        ))}
      </ol>
      <DemoInformasi />
    </Bagian>
  );
}
