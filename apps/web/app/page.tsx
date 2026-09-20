import { Peta } from "../components/Peta";
import s from "./page.module.css";

export default function Beranda() {
  return (
    <main className={s.halaman}>
      <section className={s.kepala} aria-labelledby="judul-beranda">
        <div>
          <p className={s.label}>PETA POTENSI PLTS ATAP</p>
          <h1 id="judul-beranda" className={s.judul}>
            Mulai dari satu lokasi.
          </h1>
          <p className={s.pengantar}>
            Cari alamat untuk melihat atap di sekitarnya. Angka hasil akan membawa rumus dan sumbernya.
          </p>
        </div>
      </section>

      <section className={s.barisPeta} aria-label="Peta dan status data">
        <Peta label="Peta Bengkulu" tinggi={500} />
        <aside className={s.status}>
          <div>
            <p className={s.label}>LOKASI AWAL</p>
            <h2 className={s.statusJudul}>Kota Bengkulu</h2>
            <p className={s.statusTeks}>Peta dasar siap dipakai untuk memilih bangunan.</p>
          </div>
          <p className={s.statusCatatan}>Pencarian alamat dan hasil per bangunan menyusul.</p>
        </aside>
      </section>
    </main>
  );
}
