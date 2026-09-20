import { Peta } from "../../../components/Peta";
import s from "../../placeholder.module.css";

export default async function HalamanAtap({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  return (
    <main className={s.halaman}>
      <p className={s.label}>MODE WARGA / UMKM</p>
      <h1 className={s.judul}>Hasil untuk bangunan {id}</h1>
      <p className={s.teks}>Peta lokasi sudah tersedia. Hasil kapasitas, produksi, dan balik modal akan tampil di sini.</p>
      <div className={s.grid}>
        <Peta label={`Lokasi bangunan ${id}`} tinggi={420} />
        <aside className={s.panel}>
          <h2>Menunggu analisis</h2>
          <p>Belum ada simulasi yang terhubung ke mesin hitung.</p>
        </aside>
      </div>
    </main>
  );
}
