import s from "../placeholder.module.css";

export const metadata = { title: "Sumber data" };

export default function SumberData() {
  return (
    <main className={s.halaman}>
      <p className={s.label}>SUMBER DATA</p>
      <h1 className={s.judul}>Data yang bisa ditelusuri.</h1>
      <p className={s.prosa}>
        Daftar penerbit, tanggal pengambilan, dan bagian perhitungan yang memakai setiap sumber akan tersedia di sini.
      </p>
      <section className={s.grid} aria-label="Status sumber data">
        <div className={s.panel}>
          <h2>OpenStreetMap</h2>
          <p>Jejak bangunan fixture Kota Bengkulu tersimpan bersama kueri dan tanggal pengambilan.</p>
        </div>
        <div className={s.panel}>
          <h2>Status</h2>
          <p>Daftar sumber lengkap akan dirender dari berkas sumber proyek.</p>
        </div>
      </section>
    </main>
  );
}
