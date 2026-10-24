import { z } from "zod";
import { SumberAgregasi } from "./agregasi.ts";
import { BangunanRingkas } from "./bangunan.ts";

// GET /api/v1/footprints: footprint bangunan dalam bbox peta. bbox yang memotong
// Kota Bengkulu dilayani dari snapshot OSM tanpa jaringan; di tempat lain di
// Indonesia engine memuat jendela di sekitar pusat bbox dari OSM (bukan seluruh
// bbox), dan `area_dimuat` memberi tahu bagian bbox yang tercakup. Urutan tepi
// (barat < timur, selatan < utara) dan irisan dengan daratan Indonesia diperiksa
// engine; di luar itu 422 OUT_OF_COVERAGE.

export const PermintaanFootprintArea = z.object({
  barat: z.number().min(-180).max(180).describe("Bujur tepi barat, derajat WGS84"),
  selatan: z.number().min(-90).max(90).describe("Lintang tepi selatan, derajat WGS84"),
  timur: z.number().min(-180).max(180).describe("Bujur tepi timur, derajat WGS84"),
  utara: z.number().min(-90).max(90).describe("Lintang tepi utara, derajat WGS84"),
  batas: z.number().int().min(1).max(2000).default(1500).describe("Jumlah footprint maksimum per respons"),
});

export const PerkiraanRumah = z.object({
  min_m2: z.number().positive().describe("Batas bawah luas footprint, m²"),
  max_m2: z.number().positive().describe("Batas atas luas footprint, m²"),
  dasar: z.string().describe("Asal rentang luas"),
});

export const JenisSumberFootprint = z.enum(["snapshot", "osm_daring"]);

export const AreaDimuat = z.object({
  barat: z.number().min(-180).max(180).describe("Bujur tepi barat area yang dimuat, derajat WGS84"),
  selatan: z.number().min(-90).max(90).describe("Lintang tepi selatan area yang dimuat, derajat WGS84"),
  timur: z.number().min(-180).max(180).describe("Bujur tepi timur area yang dimuat, derajat WGS84"),
  utara: z.number().min(-90).max(90).describe("Lintang tepi utara area yang dimuat, derajat WGS84"),
});

export const FootprintArea = z.object({
  permintaan: PermintaanFootprintArea,
  jumlah: z.number().int().nonnegative().describe("Footprint yang memotong bbox"),
  terpotong: z.boolean().describe("Jumlah melebihi batas; yang terdekat dari pusat bbox dikirim"),
  bangunan: z.array(BangunanRingkas).describe("Terdekat dari pusat bbox lebih dahulu"),
  perkiraan_rumah: PerkiraanRumah.optional().describe(
    "Rentang luas perkiraan rumah; hanya untuk snapshot Kota Bengkulu",
  ),
  sumber: SumberAgregasi.describe("Snapshot OSM (Mode Kota) atau layanan OSM yang dipakai untuk bangunan daring"),
  jenis_sumber: JenisSumberFootprint.optional().describe(
    "'snapshot' = berkas Kota Bengkulu; 'osm_daring' = diambil dari OSM lalu di-cache",
  ),
  area_dimuat: AreaDimuat.optional().describe(
    "Bagian bbox yang dimuat; 'osm_daring' hanya jendela sekitar pusat bbox",
  ),
});

export type PermintaanFootprintArea = z.input<typeof PermintaanFootprintArea>;
export type AreaDimuat = z.infer<typeof AreaDimuat>;
export type JenisSumberFootprint = z.infer<typeof JenisSumberFootprint>;
export type PerkiraanRumah = z.infer<typeof PerkiraanRumah>;
export type FootprintArea = z.infer<typeof FootprintArea>;
