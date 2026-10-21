import { z } from "zod";
import { SumberAgregasi } from "./agregasi.ts";
import { BangunanRingkas } from "./bangunan.ts";

// GET /api/v1/footprints: footprint snapshot OSM Kota Bengkulu yang memotong
// bbox peta. Urutan tepi (barat < timur, selatan < utara) dan irisan dengan
// batas kota diperiksa engine.

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

export const FootprintArea = z.object({
  permintaan: PermintaanFootprintArea,
  jumlah: z.number().int().nonnegative().describe("Footprint yang memotong bbox"),
  terpotong: z.boolean().describe("Jumlah melebihi batas; yang terdekat dari pusat bbox dikirim"),
  bangunan: z.array(BangunanRingkas).describe("Terdekat dari pusat bbox lebih dahulu"),
  perkiraan_rumah: PerkiraanRumah.describe("Rentang luas building=yes yang ditandai perkiraan rumah"),
  sumber: SumberAgregasi.describe("Snapshot OSM yang sama dengan Mode Kota"),
});

export type PermintaanFootprintArea = z.input<typeof PermintaanFootprintArea>;
export type PerkiraanRumah = z.infer<typeof PerkiraanRumah>;
export type FootprintArea = z.infer<typeof FootprintArea>;
