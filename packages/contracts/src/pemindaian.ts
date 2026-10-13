import { z } from "zod";
import { BangunanRingkas } from "./bangunan.ts";
import { AnalisisAtap } from "./analisis.ts";

export const TilePemindaian = z.object({
  x: z.number(), y: z.number(), url: z.url(),
});

export const BingkaiPemindaian = z.object({
  x0: z.number(), y0: z.number(),
  lebar: z.number().int().positive(), tinggi: z.number().int().positive(),
  zoom: z.number().int().min(0).max(22),
  meter_per_piksel: z.number().positive(),
  tiles: z.array(TilePemindaian),
});

export const PaketPemindaian = z.object({
  bangunan: BangunanRingkas,
  analisis: AnalisisAtap.nullable(),
  bingkai: BingkaiPemindaian,
  tersimpan: z.boolean(),
  durasi_detik: z.number().nonnegative(),
});

export type BingkaiPemindaian = z.infer<typeof BingkaiPemindaian>;
export type PaketPemindaian = z.infer<typeof PaketPemindaian>;
