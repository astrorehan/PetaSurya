import s from "./loading.module.css";

export default function MemuatPeta() {
  return (
    <main className={s.halaman} aria-busy="true">
      <h1>Temukan atap Anda.</h1>
      <p role="status">Menyiapkan katalog bangunan…</p>
      <div className={s.ruangKerja} aria-hidden="true">
        <div className={s.peta}><span /><span /><span /></div>
        <div className={s.daftar}>{Array.from({ length: 5 }, (_, i) => <div key={i}><span /><span /></div>)}</div>
      </div>
    </main>
  );
}
