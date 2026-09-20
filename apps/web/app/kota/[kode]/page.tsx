import { Peta } from "../../../components/Peta";
import s from "../../placeholder.module.css";

export default async function HalamanKota({ params }: { params: Promise<{ kode: string }> }) {
  const { kode } = await params;

  return (
    <main className={s.halaman}>
      <p className={s.label}>MODE KOTA</p>
      <h1 className={s.judul}>Potensi wilayah {kode}</h1>
      <p className={s.teks}>Peta wilayah dan agregat per kecamatan akan ditampilkan setelah data bangunan dianalisis.</p>
      <div className={s.grid}>
        <Peta label={`Peta wilayah ${kode}`} tinggi={420} />
        <aside className={s.panel}>
          <h2>Belum ada simulasi</h2>
          <p>Total kapasitas wilayah belum dihitung.</p>
        </aside>
      </div>
    </main>
  );
}
