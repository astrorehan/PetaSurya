import { BangunanRingkas, GalatApi, HasilSimulasi, PaketPemindaian, type AsumsiSimulasi, type ParameterFisika } from "@petasurya/contracts";

// NEXT_PUBLIC_API_BASE dibaca saat build klien Next.js.
export const API_BASE = (process.env.NEXT_PUBLIC_API_BASE?.trim() || "http://localhost:8000").replace(/\/+$/, "");

export type PermintaanHitungUlang = {
  roof_analysis_id: number;
  asumsi: AsumsiSimulasi;
  parameter_fisika: ParameterFisika;
  usable_area_m2?: number;
};

export class GalatSimulasi extends Error {}
export class GalatPemindaian extends Error {}

async function bacaRespons(response: Response): Promise<unknown> {
  if (!response.ok) {
    const data = GalatApi.safeParse(await response.json().catch(() => null));
    throw new GalatPemindaian(data.success ? data.data.error.message : "Layanan belum dapat dihubungi. Coba lagi.");
  }
  return response.json();
}

export async function bangunanDiArea(lat: number, lon: number) {
  const q = new URLSearchParams({ lat: String(lat), lon: String(lon), r: "200", live: "true" });
  const response = await fetch(`${API_BASE}/api/v1/buildings?${q}`, { signal: AbortSignal.timeout(30_000) });
  return BangunanRingkas.array().parse(await bacaRespons(response));
}

export async function muatKatalog() {
  const response=await fetch(`${API_BASE}/api/v1/catalog`,{signal:AbortSignal.timeout(10_000),cache:"no-store"});
  return BangunanRingkas.array().parse(await bacaRespons(response));
}

export async function indeksHasil() {
  const response=await fetch(`${API_BASE}/api/v1/scans`,{signal:AbortSignal.timeout(10_000),cache:"no-store"});
  return BangunanRingkas.shape.id.array().parse(await bacaRespons(response));
}

export async function muatPemindaian(id: number): Promise<PaketPemindaian> {
  const response = await fetch(`${API_BASE}/api/v1/scans/${id}`, { signal: AbortSignal.timeout(30_000), cache: "no-store" });
  const data = PaketPemindaian.parse(await bacaRespons(response));
  if (data.bangunan.id !== id || (data.analisis && data.analisis.building_id !== id)) throw new GalatPemindaian("Hasil bangunan tidak cocok.");
  return data;
}

export async function pindaiBangunan(id: number, force=false): Promise<PaketPemindaian> {
  const response = await fetch(`${API_BASE}/api/v1/scans`, {
    method: "POST", signal: AbortSignal.timeout(90_000), headers: {"Content-Type":"application/json"}, body: JSON.stringify({building_id:id,force}),
  });
  const data=PaketPemindaian.parse(await bacaRespons(response));
  if (data.bangunan.id !== id || data.analisis?.building_id !== id) throw new GalatPemindaian("Hasil bangunan tidak cocok.");
  return data;
}

export async function hitungUlangAtap(permintaan: PermintaanHitungUlang): Promise<HasilSimulasi> {
  const response = await fetch(`${API_BASE}/api/v1/simulate`, {
    method: "POST",
    signal: AbortSignal.timeout(20_000),
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(permintaan),
  });
  if (!response.ok) {
    const data = GalatApi.safeParse(await response.json().catch(() => null));
    throw new GalatSimulasi(data.success ? data.data.error.message : "Perhitungan gagal.");
  }
  try {
    return HasilSimulasi.parse(await response.json());
  } catch {
    throw new GalatSimulasi("Hasil perhitungan tidak valid.");
  }
}
