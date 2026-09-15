import { z } from "zod";

// Subset GeoJSON (RFC 7946) yang dipakai kontrak: hanya Polygon dan
// MultiPolygon, koordinat [lon, lat] derajat WGS84 (EPSG:4326).
// Validasi sengaja ringan (bentuk, bukan topologi) — kebenaran cincin
// (tertutup, tidak self-intersect) diuji di L1 lewat shapely, bukan di sini.

export const Posisi = z
  .tuple([z.number().min(-180).max(180), z.number().min(-90).max(90)])
  .describe("[lon, lat] derajat, WGS84");

// Cincin: minimal 4 posisi (segitiga + titik penutup).
export const Cincin = z.array(Posisi).min(4);

export const PolygonGeoJSON = z.object({
  type: z.literal("Polygon"),
  coordinates: z.array(Cincin).min(1),
});

export const MultiPolygonGeoJSON = z.object({
  type: z.literal("MultiPolygon"),
  coordinates: z.array(z.array(Cincin).min(1)),
});

export type PolygonGeoJSON = z.infer<typeof PolygonGeoJSON>;
export type MultiPolygonGeoJSON = z.infer<typeof MultiPolygonGeoJSON>;
