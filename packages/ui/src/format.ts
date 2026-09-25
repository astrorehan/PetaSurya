/*
 * Format angka Indonesia. Locale SELALU eksplisit: toLocaleString() telanjang
 * memakai locale proses (en-US di server, id-ID di peramban) dan memicu
 * hydration mismatch pada angka.
 */
const ID = "id-ID";

const angka = (n: number, maks: number) =>
  n.toLocaleString(ID, { maximumFractionDigits: maks });

/**
 * Rupiah. `ringkas` menyingkat |n| ≥ 1 juta menjadi "Rp 12,1 juta" / "Rp 1,2 miliar";
 * nilai negatif ringkas diawali tanda minus tipografis (U+2212): "−Rp 18,4 juta".
 */
export const rupiah = (n: number, ringkas = false): string => {
  const m = Math.abs(n);
  const tanda = n < 0 ? "−" : "";
  if (ringkas && m >= 1e9) return `${tanda}Rp ${angka(m / 1e9, 1)} miliar`;
  if (ringkas && m >= 1e6) return `${tanda}Rp ${angka(m / 1e6, 1)} juta`;
  return new Intl.NumberFormat(ID, {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(n);
};

/** Energi, kWh, tanpa desimal. */
export const kwh = (n: number): string => `${angka(n, 0)} kWh`;

/** Kapasitas terpasang, kWp, dua desimal. */
export const kwp = (n: number): string => `${angka(n, 2)} kWp`;

/** Emisi terhindar, tCO₂e, dua desimal. */
export const ton = (n: number): string => `${angka(n, 2)} tCO₂e`;

/** Luas, m², tanpa desimal. */
export const m2 = (n: number): string => `${angka(n, 0)} m²`;

/**
 * Lama waktu, tahun, satu desimal. Di atas umur sistem (25 tahun) ditulis
 * "lebih dari 25 tahun": presisi pada hasil yang tidak layak adalah presisi palsu.
 */
export const tahun = (n: number): string =>
  n > 25 ? "lebih dari 25 tahun" : `${angka(n, 1)} tahun`;

/** Rasio 0–1 → persen satu desimal. */
export const persen = (n: number): string => `${angka(n * 100, 1)}%`;

/**
 * Memecah angka terformat menjadi awalan, angka, dan akhiran agar angka besar
 * bisa diset dengan satuan lebih kecil: "Rp 12,1 juta" → Rp | 12,1 | juta.
 * Teks tanpa digit dikembalikan utuh sebagai `angka`.
 */
export function pecahAngka(teks: string): { awal: string; angka: string; akhir: string } {
  const m = /^(.*?)(\d[\d.,]*)(.*)$/s.exec(teks);
  if (!m) return { awal: "", angka: teks, akhir: "" };
  return { awal: m[1].trim(), angka: m[2], akhir: m[3].trim() };
}

/*
 * Satuan dibaca utuh oleh pembaca layar: "Rp" dieja "R P", "kWp" dieja per
 * huruf. Urutan penting: pola yang lebih panjang lebih dulu.
 */
const UCAPAN: [RegExp, string][] = [
  [/tCO₂e/g, "ton CO2 ekuivalen"],
  [/kWh\/m²/g, "kilowatt-jam per meter persegi"],
  [/Rp\/kWh/g, "rupiah per kilowatt-jam"],
  [/Rp\/kWp/g, "rupiah per kilowatt-peak"],
  [/kWh/g, "kilowatt-jam"],
  [/MWp/g, "megawatt-peak"],
  [/kWp/g, "kilowatt-peak"],
  [/m²/g, "meter persegi"],
  [/%/g, " persen"],
  [/\/(tahun|bulan|hari)/g, " per $1"],
  [/−/g, "minus "],
];

/**
 * Versi ucapan untuk aria-label: "Rp 12,1 juta" → "12,1 juta rupiah",
 * "14,3 kWp" → "14,3 kilowatt-peak".
 */
export function ucapan(teks: string): string {
  let s = teks.replace(/Rp\s?([\d.,]+(?:\s(?:juta|miliar))?)/g, "$1 rupiah");
  for (const [pola, ganti] of UCAPAN) s = s.replace(pola, ganti);
  return s.replace(/\s+/g, " ").trim();
}
