/*
 * Data contoh untuk lembar referensi. Semua dari fixture yang sama dengan
 * layar hasil atap; tidak ada angka yang dibuat khusus untuk halaman ini.
 */
import type { AnalisisAtap, BangunanRingkas, HasilSimulasi } from "@petasurya/contracts";
import analisisKampusJson from "../../../../../data/fixtures/analisis/cv-kampus-fh-unib.json";
import analisisTokoJson from "../../../../../data/fixtures/analisis/cv-toko-wr-supratman.json";
import analisisLimunJson from "../../../../../data/fixtures/analisis/fallback-rumah-kandang-limun.json";
import bangunanLimunJson from "../../../../../data/fixtures/bangunan/rumah-kandang-limun.json";
import bangunanTokoJson from "../../../../../data/fixtures/bangunan/toko-wr-supratman.json";
import simulasiTokoJson from "../../../../../data/fixtures/simulasi/contoh-3f8c.json";
import simulasiLimunJson from "../../../../../data/fixtures/simulasi/contoh-limun-1145010599.json";
import simulasiKampusJson from "../../../../../data/fixtures/simulasi/contoh-unib-1146141501.json";
import type { Titik } from "./_geo";

export const toko = {
  bangunan: bangunanTokoJson as unknown as BangunanRingkas,
  analisis: analisisTokoJson as unknown as AnalisisAtap,
  simulasi: simulasiTokoJson as unknown as HasilSimulasi,
};

export const limun = {
  bangunan: bangunanLimunJson as unknown as BangunanRingkas,
  analisis: analisisLimunJson as unknown as AnalisisAtap,
  simulasi: simulasiLimunJson as unknown as HasilSimulasi,
};

export const kampus = {
  analisis: analisisKampusJson as unknown as AnalisisAtap,
  simulasi: simulasiKampusJson as unknown as HasilSimulasi,
};

/** Cincin luar jejak OSM (lon, lat), tertutup. */
export const cincinToko = bangunanTokoJson.geom.coordinates[0] as Titik[];
export const cincinLimun = bangunanLimunJson.geom.coordinates[0] as Titik[];

/** Peringatan fixture jalur mundur; bisa kosong pada kontrak, di sini selalu ada. */
export const peringatanLimun = analisisLimunJson.peringatan;
