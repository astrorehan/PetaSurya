/** Titik WGS84 dalam derajat desimal. */
export type Titik = { lat: number; lon: number };

const ANGKA = String.raw`[-+]?\d{1,3}(?:[.,]\d+)?`;
// "lat, lon" atau "lat lon"; desimal titik atau koma (gaya id-ID) bila pemisahnya jelas.
const PASANGAN = new RegExp(String.raw`^\s*(${ANGKA})\s*(?:[,;]\s*|\s+)(${ANGKA})\s*$`);
// Tautan Google Maps: !3d/!4d = titik tempat, @lat,lon = pusat kamera, q/query/ll/destination = titik kueri.
const TEMPAT = /!3d(-?\d+(?:\.\d+)?)!4d(-?\d+(?:\.\d+)?)/;
const KAMERA = /@(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/;
const PARAMETER = /[?&](?:q|query|ll|destination|center)=(-?\d+(?:\.\d+)?)(?:,|%2C)\s*(?:\+|%20)?(-?\d+(?:\.\d+)?)/i;

function sah(lat: number, lon: number): Titik | null {
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;
  if (Math.abs(lat) > 90 || Math.abs(lon) > 180) return null;
  return { lat, lon };
}

function angka(teks: string): number {
  return Number(teks.replace(",", "."));
}

/**
 * Mengurai koordinat yang ditempel pengguna: pasangan "lintang, bujur" seperti
 * yang disalin dari Google Maps, atau tautan Google Maps yang memuat titiknya.
 * Tautan pendek maps.app.goo.gl tidak memuat koordinat, jadi tidak dikenali.
 */
export function uraiKoordinat(masukan: string): Titik | null {
  const teks = masukan.trim();
  if (!teks) return null;
  if (/^https?:\/\//i.test(teks) || teks.includes("google.")) {
    for (const pola of [TEMPAT, PARAMETER, KAMERA]) {
      const m = teks.match(pola);
      if (m) return sah(Number(m[1]), Number(m[2]));
    }
    return null;
  }
  const m = teks.match(PASANGAN);
  if (!m) return null;
  // Tanpa bagian desimal, "12 34" lebih mungkin nomor rumah daripada koordinat.
  if (!/[.,]\d/.test(m[1]) || !/[.,]\d/.test(m[2])) return null;
  return sah(angka(m[1]), angka(m[2]));
}

/** Format id-ID enam desimal (±0,1 m), dipakai pada kartu titik. */
export function formatKoordinat({ lat, lon }: Titik): string {
  const f = (n: number) => n.toLocaleString("id-ID", { minimumFractionDigits: 6, maximumFractionDigits: 6 });
  return `${f(lat)}; ${f(lon)}`;
}
