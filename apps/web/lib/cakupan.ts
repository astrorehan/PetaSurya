import type { Kotak } from "./area";

/** Batas geser peta [barat, selatan, timur, utara]: Sabang sampai Merauke, Miangas sampai Rote, dengan sedikit ruang. */
export const BATAS_INDONESIA: Kotak = [94.5, -11.5, 141.5, 6.5];
/** Pusat awal ruang kerja: Bengkulu, tempat contoh dan hasil tersimpan berada. */
export const PUSAT_BENGKULU: [number, number] = [102.269, -3.7618];

/** Seluruh `dalam` berada di dalam `luar`; tepi yang sama dihitung di dalam. */
export function kotakDalam(dalam: Kotak, luar: Kotak): boolean {
  return dalam[0] >= luar[0] && dalam[1] >= luar[1] && dalam[2] <= luar[2] && dalam[3] <= luar[3];
}

/** Titik tengah kotak [bujur, lintang]. */
export function pusatKotak(kotak: Kotak): [number, number] {
  return [(kotak[0] + kotak[2]) / 2, (kotak[1] + kotak[3]) / 2];
}
