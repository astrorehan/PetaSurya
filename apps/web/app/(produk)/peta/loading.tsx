import s from "./loading.module.css";

// Kerangka mengikuti tata letak ruang kerja agar isi yang datang tidak menggeser halaman.
export default function MemuatPeta() {
  return (
    <main className={s.halaman} aria-busy="true" data-memuat-rute>
      <div className={s.kepala}>
        <h1>Temukan <span>atap Anda.</span></h1>
        <p role="status">Menyiapkan katalog bangunan…</p>
      </div>
      <div className={s.alur} aria-hidden="true"><span /><span /><span /></div>
      <div className={s.ruangKerja} aria-hidden="true">
        <div className={s.bilah}><span /></div>
        <div className={s.baris}>
          <div className={s.peta}><span /><span /><span /></div>
          <div className={s.daftar}>{Array.from({ length: 6 }, (_, i) => <div key={i}><span /><span /></div>)}</div>
        </div>
      </div>
    </main>
  );
}
