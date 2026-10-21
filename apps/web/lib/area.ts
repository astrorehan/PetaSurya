import type { BangunanRingkas } from "@petasurya/contracts";

/** [barat, selatan, timur, utara], derajat WGS84. */
export type Kotak = [number, number, number, number];

// Pada zoom 15,5 satu tampilan desktop selebar ±3 km; di bawahnya footprint
// terlalu rapat untuk dipilih, jadi area baru dimuat setelah peta diperbesar.
export const ZOOM_MUAT = 15.5;
// Footprint yang ditahan peramban; beberapa ribu poligon tetap ringan untuk MapLibre.
export const BATAS_SIMPANAN = 6000;

const kotakCache = new WeakMap<BangunanRingkas, Kotak>();

export function kotakBangunan(b: BangunanRingkas): Kotak {
  let kotak = kotakCache.get(b);
  if (!kotak) {
    kotak = [Infinity, Infinity, -Infinity, -Infinity];
    for (const [x, y] of b.geom.coordinates[0]) {
      kotak = [Math.min(kotak[0], x), Math.min(kotak[1], y), Math.max(kotak[2], x), Math.max(kotak[3], y)];
    }
    kotakCache.set(b, kotak);
  }
  return kotak;
}

/** Kotak pembatas bangunan memotong area; aturan yang sama dengan engine. */
export function memotongArea(b: BangunanRingkas, area: Kotak): boolean {
  const [x0, y0, x1, y1] = kotakBangunan(b);
  return x1 >= area[0] && x0 <= area[2] && y1 >= area[1] && y0 <= area[3];
}

/** Gabung tanpa ID ganda; kemunculan pertama yang dipakai. */
export function gabungBangunan(...daftar: BangunanRingkas[][]): BangunanRingkas[] {
  const hasil = new Map<number, BangunanRingkas>();
  for (const bagian of daftar) for (const b of bagian) if (!hasil.has(b.id)) hasil.set(b.id, b);
  return [...hasil.values()];
}

/** Area terbaru di depan; yang paling lama dimuat dilepas lebih dulu. */
export function simpanArea(lama: BangunanRingkas[], baru: BangunanRingkas[], batas = BATAS_SIMPANAN): BangunanRingkas[] {
  return gabungBangunan(baru, lama).slice(0, batas);
}
