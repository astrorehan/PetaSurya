import { z } from "zod";
import { PolygonGeoJSON } from "./geojson.ts";

// Jejak bangunan ringkas (cetak biru §03 tabel `buildings`): bentuk yang
// dikirim GET /buildings dan dipakai sebagai fixture.

export const SumberBangunan = z.enum(["osm", "ms_footprints", "user_drawn"]);

export const BangunanRingkas = z.object({
  id: z.number().int().positive().describe("id bangunan di basis data"),
  source: SumberBangunan,
  source_ref: z.string().describe("Rujukan di sumber, mis. 'way/123456789'"),
  geom: PolygonGeoJSON.describe("Jejak bangunan, WGS84"),
  footprint_m2: z.number().positive().describe("Luas jejak geodesik, m²"),
  building_tag: z.string().nullable().describe("Tag OSM building=*, mis. 'house'"),
  levels: z.number().int().positive().nullable().optional().describe("Jumlah lantai bila diketahui"),
  nama: z.string().nullable().optional().describe("Nama di sumber bila ada"),
  region_code: z.string().nullable().optional().describe("Kode BPS wilayah bila sudah dipetakan"),
});

export type BangunanRingkas = z.infer<typeof BangunanRingkas>;
