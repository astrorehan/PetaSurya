import { z } from "zod";

// GET /api/v1/wilayah?lat=…&lon=…: provinsi di titik dan faktor emisi sistem
// listrik setempat sebagai asumsi bawaan. Titik di luar Indonesia ditolak
// engine dengan OUT_OF_COVERAGE.

export const PermintaanWilayah = z.object({
  lat: z.number().min(-90).max(90).describe("Lintang titik, derajat WGS84"),
  lon: z.number().min(-180).max(180).describe("Bujur titik, derajat WGS84"),
});

export const StatusFaktorEmisi = z
  .enum(["terverifikasi", "perkiraan", "belum_diverifikasi"])
  .describe(
    "terverifikasi: tercantum di dokumen; perkiraan: dipilih PetaSurya; belum_diverifikasi: kosong",
  );

export const InfoWilayah = z.object({
  provinsi_iso: z.string().regex(/^ID-[A-Z]{2}$/).describe("Kode ISO 3166-2 provinsi, mis. ID-BE"),
  provinsi_nama: z.string().describe("Nama provinsi"),
  sistem_grid: z.string().nullable().describe("Nama sistem ketenagalistrikan pada dokumen sumber; null bila belum diverifikasi"),
  ef_grid_tco2_mwh: z.number().positive().nullable().describe("Faktor emisi jaringan, tCO2/MWh; null bila belum diverifikasi"),
  rentang_tco2_mwh: z
    .array(z.number().positive())
    .length(2)
    .nullable()
    .describe("[terendah, tertinggi] faktor emisi antarsistem terpisah dalam provinsi, tCO2/MWh"),
  tahun_data: z.number().int().describe("Tahun data faktor emisi, bukan tahun simulasi"),
  metode: z.string().describe("Kolom dokumen yang dipakai dan cakupan gas"),
  status: StatusFaktorEmisi,
  catatan: z.string().describe("Dasar pemilihan sistem untuk provinsi ini"),
  sumber_id: z.string().describe("Kunci entri pada registri sumber"),
  sumber_url: z.string().url().describe("Tautan dokumen sumber"),
});

export type PermintaanWilayah = z.input<typeof PermintaanWilayah>;
export type StatusFaktorEmisi = z.infer<typeof StatusFaktorEmisi>;
export type InfoWilayah = z.infer<typeof InfoWilayah>;
