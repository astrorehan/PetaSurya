import { z } from "zod";
import { BangunanRingkas } from "./bangunan.ts";

// GET /api/v1/alamat?q=…: alamat di Kota Bengkulu dari geocoder OSM, beserta
// footprint snapshot yang memuat titik alamat atau yang terdekat darinya.

export const PermintaanAlamat = z.object({
  q: z.string().trim().min(3).max(200).describe("Alamat atau nama tempat yang diketik pengguna"),
});

export const KecocokanBangunan = z.enum(["memuat", "terdekat"]);

export const HasilAlamat = z.object({
  nama: z.string().describe("Baris pertama alamat untuk ditampilkan"),
  alamat: z.string().describe("Alamat lengkap dari geocoder"),
  lat: z.number().min(-90).max(90).describe("Lintang titik alamat, derajat WGS84"),
  lon: z.number().min(-180).max(180).describe("Bujur titik alamat, derajat WGS84"),
  presisi: z.string().describe("Jenis objek OSM yang cocok, mis. 'house', 'road', 'building'"),
  bangunan: BangunanRingkas.nullable().describe("Footprint snapshot pada atau dekat titik alamat"),
  kecocokan: KecocokanBangunan.nullable().describe("'memuat' bila titik di dalam footprint"),
  jarak_m: z.number().nonnegative().nullable().describe("Jarak titik ke footprint, meter; 0 bila memuat"),
});

export const PencarianAlamat = z.object({
  kueri: z.string(),
  hasil: z.array(HasilAlamat).describe("Hanya titik di dalam batas Kota Bengkulu"),
  atribusi: z.string().describe("Atribusi data geocoder yang wajib ditampilkan"),
});

export type PermintaanAlamat = z.input<typeof PermintaanAlamat>;
export type KecocokanBangunan = z.infer<typeof KecocokanBangunan>;
export type HasilAlamat = z.infer<typeof HasilAlamat>;
export type PencarianAlamat = z.infer<typeof PencarianAlamat>;
