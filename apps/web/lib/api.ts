import { HasilSimulasi, type AsumsiSimulasi, type ParameterFisika } from "@petasurya/contracts";

// NEXT_PUBLIC_API_BASE dibaca saat build klien Next.js.
export const API_BASE = (process.env.NEXT_PUBLIC_API_BASE?.trim() || "http://localhost:8000").replace(/\/+$/, "");

export type PermintaanHitungUlang = {
  roof_analysis_id: number;
  asumsi: AsumsiSimulasi;
  parameter_fisika: ParameterFisika;
};

export class GalatSimulasi extends Error {}

export async function hitungUlangAtap(permintaan: PermintaanHitungUlang): Promise<HasilSimulasi> {
  const response = await fetch(`${API_BASE}/api/v1/simulate`, {
    method: "POST",
    signal: AbortSignal.timeout(20_000),
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(permintaan),
  });
  if (!response.ok) throw new GalatSimulasi("Perhitungan gagal.");
  try {
    return HasilSimulasi.parse(await response.json());
  } catch {
    throw new GalatSimulasi("Hasil perhitungan tidak valid.");
  }
}
