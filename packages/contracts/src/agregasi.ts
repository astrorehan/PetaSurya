import { z } from "zod";
import { AsumsiSimulasi, JejakRumus, ParameterFisika } from "./simulasi.ts";

export const UrutanAgregasi = z.enum(["kwp", "payback", "lcoe"]);

export const PermintaanAgregasi = z.object({
  kode_wilayah: z.literal("1771").describe("Kode Kota Bengkulu; cakupan cuaca dan snapshot OSM"),
  fraksi_layak: z.number().min(0).max(1).describe("Bagian footprint yang diasumsikan layak, fraksi; bukan hasil segmentasi"),
  tilt_deg: z.number().min(0).max(90).describe("Kemiringan panel seragam, derajat; asumsi skenario"),
  azimuth_deg: z.number().min(0).max(360).describe("Hadap panel dari utara, derajat; asumsi skenario"),
  adopsi: z.number().min(0).max(1).describe("Fraksi jumlah atap layak yang dipilih, dibulatkan ke bawah"),
  urut: UrutanAgregasi,
  asumsi: AsumsiSimulasi.extend({ umur_tahun: z.number().int().positive().max(100).default(25) }),
  parameter_fisika: ParameterFisika,
});

export const RingkasanAgregasi = z.object({
  n_bangunan: z.number().int().nonnegative(),
  module_count: z.number().int().nonnegative(),
  footprint_m2: z.number().nonnegative(),
  usable_area_m2: z.number().nonnegative(),
  kwp: z.number().nonnegative(),
  e_ac_kwh_yr1: z.number().nonnegative().describe("Energi AC tahun pertama, kWh"),
  co2_ton_yr1: z.number().nonnegative().describe("Emisi grid terhindar tahun pertama, tCO2; faktor ESDM mengukur CO2"),
  capex_idr: z.number().nonnegative(),
  savings_idr_yr1: z.number().nonnegative(),
  payback_median_years: z.number().nonnegative().nullable().describe("Median hanya atap yang balik modal; null bila tidak ada"),
});

export const WilayahAgregasi = z.object({
  id: z.string(),
  nama: z.string(),
  n_tercatat: z.number().int().nonnegative().describe("Jumlah footprint pada snapshot, termasuk yang terlalu kecil"),
  potensi: RingkasanAgregasi,
  skenario: RingkasanAgregasi,
});

export const SumberAgregasi = z.object({
  penerbit: z.string(),
  url: z.url(),
  diambil: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  timestamp_osm: z.string(),
  catatan: z.string(),
});

export const HasilAgregasi = z.object({
  kode_wilayah: z.literal("1771"),
  engine_version: z.string(),
  jenis_potensi: z.literal("estimasi_footprint"),
  permintaan: PermintaanAgregasi,
  sumber: SumberAgregasi,
  cakupan: z.object({
    n_tercatat: z.number().int().nonnegative(),
    n_layak: z.number().int().nonnegative(),
    n_terlalu_kecil: z.number().int().nonnegative(),
    n_tanpa_wilayah: z.number().int().nonnegative(),
    n_batas_wilayah: z.number().int().nonnegative(),
    catatan: z.string(),
  }),
  potensi: RingkasanAgregasi,
  skenario: RingkasanAgregasi,
  wilayah: z.array(WilayahAgregasi),
  tanpa_wilayah: WilayahAgregasi,
  jejak: z.object({
    kapasitas: JejakRumus,
    energi: JejakRumus,
    ekonomi: JejakRumus,
    karbon: JejakRumus,
    adopsi: JejakRumus,
  }),
});

export type PermintaanAgregasi = z.infer<typeof PermintaanAgregasi>;
export type RingkasanAgregasi = z.infer<typeof RingkasanAgregasi>;
export type HasilAgregasi = z.infer<typeof HasilAgregasi>;
export type WilayahAgregasi = z.infer<typeof WilayahAgregasi>;
