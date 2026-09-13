/*
 * Format angka Indonesia. Locale SELALU eksplisit: toLocaleString() telanjang
 * memakai locale proses (en-US di server, id-ID di peramban) dan memicu
 * hydration mismatch pada angka.
 */
const ID = "id-ID";

const angka = (n: number, maks: number) =>
  n.toLocaleString(ID, { maximumFractionDigits: maks });

/** Rupiah. `ringkas` menyingkat ≥ 1 juta menjadi "Rp 12,1 juta" / "Rp 1,2 miliar". */
export const rupiah = (n: number, ringkas = false): string =>
  ringkas && n >= 1e9
    ? `Rp ${angka(n / 1e9, 1)} miliar`
    : ringkas && n >= 1e6
      ? `Rp ${angka(n / 1e6, 1)} juta`
      : new Intl.NumberFormat(ID, {
          style: "currency",
          currency: "IDR",
          maximumFractionDigits: 0,
        }).format(n);

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
