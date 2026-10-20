import katalog from "../../../data/fixtures/katalog-bangunan.json";
import s from "./jejakKawasan.module.css";

const bangunan = katalog.bangunan;
const titik = bangunan.flatMap((b) => b.geom.coordinates.flat());
const barat = Math.min(...titik.map(([x]) => x));
const timur = Math.max(...titik.map(([x]) => x));
const selatan = Math.min(...titik.map(([, y]) => y));
const utara = Math.max(...titik.map(([, y]) => y));
const koreksiLintang = Math.cos((utara + selatan) / 2 * Math.PI / 180);
const skala = Math.min(880 / ((timur - barat) * koreksiLintang), 560 / (utara - selatan));
const tengahX = (barat + timur) / 2;
const tengahY = (utara + selatan) / 2;
const jejak = bangunan.map((b) => ({
  id: b.id,
  d: b.geom.coordinates.map((ring) => ring.map(([x, y], i) =>
    `${i ? "L" : "M"}${(500 + (x - tengahX) * koreksiLintang * skala).toFixed(2)},${(340 - (y - tengahY) * skala).toFixed(2)}`,
  ).join(" ") + "Z").join(" "),
}));

export const JUMLAH_BANGUNAN_AWAL = bangunan.length;

export function JejakKawasan({ className = "", dekoratif = false }: { className?: string; dekoratif?: boolean }) {
  return (
    <svg className={`${s.kawasan} ${className}`} viewBox="0 0 1000 680" fill="none" aria-hidden={dekoratif || undefined} role={dekoratif ? undefined : "img"} aria-label={dekoratif ? undefined : "Jejak bangunan OpenStreetMap di sekitar Universitas Bengkulu"} focusable="false">
      <g className={s.grid}>
        {[100, 200, 300, 400, 500, 600, 700, 800, 900].map((x) => <path key={`x${x}`} d={`M${x} 0V680`} />)}
        {[40, 140, 240, 340, 440, 540, 640].map((y) => <path key={`y${y}`} d={`M0 ${y}H1000`} />)}
      </g>
      <g className={s.bangunan}>
        {jejak.map(({ id, d }) => <path key={id} d={d} data-sorot={id === 1146141501 || undefined} />)}
      </g>
      <g className={s.bidik}>
        <path d="M478 340h-18m62 0h18M500 318v-18m0 62v18" />
        <circle cx="500" cy="340" r="7" />
      </g>
    </svg>
  );
}
