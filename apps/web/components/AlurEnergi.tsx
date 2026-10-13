import { House, Sun, Wallet } from "lucide-react";
import s from "./motionAtap.module.css";

/** Grafik alir menunjukkan hubungan energi dan penghematan; posisi panel bukan rancangan pemasangan. */
export function AlurEnergi() {
  return <div className={s.alurEnergi} role="img" aria-label="Matahari menghasilkan listrik pada PLTS atap, lalu mengurangi biaya listrik.">
    <svg viewBox="0 0 600 126" aria-hidden="true">
      <path className={s.sambungan} d="M108 48H262M338 48H492" />
      <path className={s.aliran} d="M108 48H262M338 48H492" />
      {[72,300,528].map(x=><circle key={x} className={s.simpul} cx={x} cy={48} r={32}/>)}
      <Sun x={60} y={36} width={24} height={24} className={s.ikonSurya}/>
      <House x={288} y={36} width={24} height={24} className={s.ikonSurya}/>
      <Wallet x={516} y={36} width={24} height={24} className={s.ikonDaun}/>
      <text className={s.labelAlur} x={72} y={110} textAnchor="middle">Matahari</text>
      <text className={s.labelAlur} x={300} y={110} textAnchor="middle">PLTS atap</text>
      <text className={s.labelAlur} x={528} y={110} textAnchor="middle">Penghematan</text>
    </svg>
  </div>;
}
