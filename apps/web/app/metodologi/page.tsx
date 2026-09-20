import s from "../placeholder.module.css";

export const metadata = { title: "Metodologi" };

export default function Metodologi() {
  return (
    <main className={s.halaman}>
      <p className={s.label}>METODOLOGI</p>
      <h1 className={s.judul}>Setiap angka punya jejak.</h1>
      <p className={s.prosa}>
        Halaman ini akan menjelaskan bagaimana citra, iradiansi, produksi energi, ekonomi, dan karbon dirangkai menjadi satu hasil yang dapat diperiksa.
      </p>
      <section className={s.grid} aria-label="Lapisan perhitungan">
        <div className={s.panel}>
          <h2>Urutan hitung</h2>
          <p>Data lokasi → analisis atap → energi tahunan → penghematan → karbon.</p>
        </div>
        <div className={s.panel}>
          <h2>Status</h2>
          <p>Rincian rumus sedang disiapkan bersama mesin hitung.</p>
        </div>
      </section>
    </main>
  );
}
