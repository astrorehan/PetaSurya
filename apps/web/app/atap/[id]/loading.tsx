import s from "../../../components/hasilAtap.module.css";

export default function MemuatAtap() {
  return (
    <main className={s.halaman} aria-busy="true" aria-label="Memuat hasil analisis atap">
      <div className={s.skeletonKepala}>
        <span className={s.skeletonLabel} />
        <span className={s.skeletonJudul} />
      </div>
      <span className={s.skeletonHasil} />
      <div className={s.skeletonGrid}>
        <span className={s.skeletonPeta} />
        <span className={s.skeletonPanel} />
      </div>
      <span className={s.srOnly}>Hasil sedang dimuat.</span>
    </main>
  );
}
