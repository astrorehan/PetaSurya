/*
 * Skala warna peta potensi: gradasi tunggal amber, lebih terang = lebih banyak
 * energi. Skala pelangi menciptakan batas semu di data yang mulus dan tidak
 * terbaca oleh sebagian pengguna buta warna. Nilai hex di sini adalah data
 * (dipakai MapLibre lewat ekspresi step), bukan gaya komponen.
 *
 * batas: kWp minimum kelas; warna: isi poligon untuk kelas itu.
 */
export const SKALA_KWP = [
  { batas: 0, warna: "#3A2A10" },
  { batas: 25, warna: "#7A4A12" },
  { batas: 50, warna: "#C4700A" },
  { batas: 100, warna: "#E8920F" },
  { batas: 200, warna: "#FFC46B" },
] as const;

/*
 * Atap berkeyakinan rendah diarsir miring, bukan diwarnai berbeda,
 * sehingga satu dimensi visual tetap berarti satu variabel.
 */
export const POLA_KEYAKINAN_RENDAH = "diagonal-hatch-8";

/** Warna kelas untuk nilai kWp tertentu. */
export function warnaKwp(kwp: number): string {
  let warna: string = SKALA_KWP[0].warna;
  for (const k of SKALA_KWP) if (kwp >= k.batas) warna = k.warna;
  return warna;
}
