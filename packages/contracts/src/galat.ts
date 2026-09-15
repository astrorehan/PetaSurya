import { z } from "zod";

// Amplop galat seragam semua endpoint (cetak biru §04).
export const KodeGalat = z.enum([
  "BUILDING_NOT_FOUND", // 404
  "IMAGERY_UNAVAILABLE", // 503 → mundur ke jejak bangunan
  "IRRADIANCE_UNAVAILABLE", // 503 → sel kisi terdekat
  "TARIFF_NOT_FOUND", // 422
  "ROOF_TOO_SMALL", // 422, luas layak < 1 modul
  "NARRATION_UNVERIFIED", // 502
  "DEVICE_UNAUTHORIZED", // 401
  "VALIDATION_ERROR", // 422, badan permintaan tidak lolos kontrak
  "INTERNAL", // 500
]);

export const GalatApi = z.object({
  error: z.object({
    code: KodeGalat,
    message: z.string().describe("Kalimat untuk pengguna, bahasa Indonesia"),
    hint: z.string().optional().describe("Saran tindakan"),
    retriable: z.boolean(),
  }),
});

export type GalatApi = z.infer<typeof GalatApi>;
