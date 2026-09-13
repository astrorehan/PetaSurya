import type { ZodType } from "zod";

// Registri skema yang di-generate ke JSON Schema lalu pydantic.
// Kunci = nama kelas di sisi Python. Skema domain (simulasi, bangunan,
// analisis, galat) ditambahkan di lapisan L0.
export const registri: Record<string, ZodType> = {};
