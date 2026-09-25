/*
 * Bahasa antarmuka. Alat ukur menyebut angka dan satuannya; klaim pemasaran
 * tanpa angka dan sapaan brosur tidak dipakai. Daftar ini diuji atas sumber
 * apps/web (apps/web/test/bahasa.test.ts), jadi layar baru ikut terperiksa.
 */
export const KATA_TERLARANG = [
  "revolusioner",
  "canggih",
  "solusi",
  "terbaik",
  "selamat datang",
  "mulai sekarang",
  "unlock",
  "seamless",
  "powerful",
  "cutting-edge",
  "empower",
] as const;

/** Satu-satunya tagline produk. */
export const TAGLINE = "Atapmu, dihitung.";
