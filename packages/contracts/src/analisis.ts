import { z } from "zod";
import { MultiPolygonGeoJSON } from "./geojson.ts";

// Keluaran L2 (cetak biru §04, POST /analyze). Satu bentuk untuk dua jalur:
// `method: "cv"` membawa mask hasil segmentasi; `footprint_fallback` tidak
// punya mask, luas diperkirakan dari jejak OSM × 0,85 dan disertai
// `peringatan` untuk ditampilkan sebagai keyakinan rendah.

export const TipeAtap = z.enum(["datar", "pelana", "limas", "kompleks"]);
export const MetodeAnalisis = z.enum(["cv", "footprint_fallback", "manual"]);

export const CitraAnalisis = z.object({
  source: z.string().describe("Penyedia citra, mis. 'esri-world-imagery'"),
  date: z.string().nullable().describe("Tanggal citra ISO-8601 bila diketahui"),
});

export const AnalisisAtap = z.object({
  roof_analysis_id: z.number().int().positive(),
  building_id: z.number().int().positive(),
  roof_area_m2: z.number().nonnegative().describe("Luas atap terdeteksi, m²"),
  usable_area_m2: z.number().nonnegative().describe("Luas layak setelah obstruksi & sempadan, m²"),
  obstruction_frac: z.number().min(0).max(1),
  tilt_deg: z.number().min(0).max(60).describe("Kemiringan atap, derajat"),
  azimuth_deg: z.number().min(0).max(360).describe("Arah hadap, derajat dari utara searah jarum jam"),
  roof_type: TipeAtap,
  confidence: z.number().min(0).max(1),
  method: MetodeAnalisis,
  model_version: z.string(),
  imagery: CitraAnalisis,
  mask_geojson: MultiPolygonGeoJSON.nullable().describe("null bila tidak ada segmentasi"),
  catatan: z.string().optional(),
  peringatan: z.string().optional().describe("Diisi bila method bukan 'cv'"),
});

export type AnalisisAtap = z.infer<typeof AnalisisAtap>;
