/*
 * Proyeksi ekuirektangular lokal untuk plot survei satu bangunan. Pada skala
 * puluhan meter distorsinya < 0,01 %, dan rumusnya sama dengan yang dipakai
 * untuk footprint_m2 fixture (shoelace ekuirektangular lokal), sehingga luas
 * yang tergambar sama dengan luas di data.
 *
 *   x = (λ − λ₀) · cos φ₀ · R,   y = (φ − φ₀) · R,   R = 6.371.008,8 m (jari-jari rata-rata IUGG)
 *   φ₀, λ₀ = rata-rata simpul (tanpa titik penutup)
 */
const R = 6371008.8;
const RAD = Math.PI / 180;

export type Titik = [number, number];

/** Cincin [lon, lat] (tertutup) → titik meter terhadap rata-rata simpul, tanpa titik penutup. */
export function proyeksi(cincin: readonly Titik[]): Titik[] {
  const simpul = cincin.slice(0, -1);
  const lat0 = simpul.reduce((a, p) => a + p[1], 0) / simpul.length;
  const lon0 = simpul.reduce((a, p) => a + p[0], 0) / simpul.length;
  const kx = RAD * R * Math.cos(lat0 * RAD);
  return simpul.map(([lon, lat]) => [(lon - lon0) * kx, (lat - lat0) * RAD * R]);
}

/** Luas bertanda (shoelace), m². Positif = berlawanan arah jarum jam. */
export function luasBertanda(p: readonly Titik[]): number {
  let a = 0;
  for (let i = 0; i < p.length; i++) {
    const [x1, y1] = p[i];
    const [x2, y2] = p[(i + 1) % p.length];
    a += x1 * y2 - x2 * y1;
  }
  return a / 2;
}

/** Panjang tiap sisi i → i+1, m. */
export function panjangSisi(p: readonly Titik[]): number[] {
  return p.map((a, i) => {
    const b = p[(i + 1) % p.length];
    return Math.hypot(b[0] - a[0], b[1] - a[1]);
  });
}

/** Titik berat poligon (bukan rata-rata simpul), m. */
export function titikBerat(p: readonly Titik[]): Titik {
  const a = luasBertanda(p);
  let cx = 0;
  let cy = 0;
  for (let i = 0; i < p.length; i++) {
    const [x1, y1] = p[i];
    const [x2, y2] = p[(i + 1) % p.length];
    const f = x1 * y2 - x2 * y1;
    cx += (x1 + x2) * f;
    cy += (y1 + y2) * f;
  }
  return [cx / (6 * a), cy / (6 * a)];
}
