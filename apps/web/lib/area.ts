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

/**
 * Cakupan respons footprint. Di dalam Kota Bengkulu engine memotong snapshot
 * sesuai bbox; di tempat lain ia membaca OpenStreetMap langsung hanya untuk
 * jendela kecil di sekitar pusat bbox, tercatat di `dimuat`.
 */
export type CakupanArea = { langsung: boolean; dimuat: Kotak | null };

// Pusat peta yang bergeser kurang dari seperempat lebar jendela tidak memuat ulang:
// bangunan di sekitarnya sudah ada dan Overpass tidak perlu dipanggil tiap geseran kecil.
const MARGIN_JENDELA = 0.25;

/** Perlu meminta area baru bila kamera keluar dari jendela footprint langsung. */
export function perluMuatArea(kamera: Kotak, cakupan: CakupanArea | null): boolean {
  if (!cakupan?.langsung || !cakupan.dimuat) return true;
  const [b, s, t, u] = cakupan.dimuat;
  if (kamera[0] >= b && kamera[1] >= s && kamera[2] <= t && kamera[3] <= u) return false;
  const x = (kamera[0] + kamera[2]) / 2;
  const y = (kamera[1] + kamera[3]) / 2;
  const mx = (t - b) * MARGIN_JENDELA;
  const my = (u - s) * MARGIN_JENDELA;
  return !(x >= b + mx && x <= t - mx && y >= s + my && y <= u - my);
}

function titikDalamCincin(lon: number, lat: number, cincin: number[][]): boolean {
  let dalam = false;
  for (let i = 0, j = cincin.length - 1; i < cincin.length; j = i++) {
    const [xi, yi] = cincin[i];
    const [xj, yj] = cincin[j];
    if ((yi > lat) !== (yj > lat) && lon < ((xj - xi) * (lat - yi)) / (yj - yi) + xi) dalam = !dalam;
  }
  return dalam;
}

/** Bangunan yang cincin luarnya memuat titik, tanpa memperhitungkan lubang. */
export function bangunanDiTitik(daftar: BangunanRingkas[], lon: number, lat: number): BangunanRingkas | null {
  for (const b of daftar) {
    const [x0, y0, x1, y1] = kotakBangunan(b);
    if (lon < x0 || lon > x1 || lat < y0 || lat > y1) continue;
    if (titikDalamCincin(lon, lat, b.geom.coordinates[0])) return b;
  }
  return null;
}
