import type { CakupanArea } from "./area";
import { BangunanRingkas, FootprintArea, GalatApi, HasilAgregasi, HasilSimulasi, InfoWilayah, PaketPemindaian, PencarianAlamat, PermintaanAgregasi, PermintaanAlamat, PermintaanFootprintArea, type AsumsiSimulasi, type ParameterFisika } from "@petasurya/contracts";

// NEXT_PUBLIC_API_BASE dibaca saat build klien Next.js.
export const API_BASE = (process.env.NEXT_PUBLIC_API_BASE?.trim() || "http://localhost:8000").replace(/\/+$/, "");

export type PermintaanHitungUlang = {
  roof_analysis_id: number;
  asumsi: AsumsiSimulasi;
  parameter_fisika: ParameterFisika;
  usable_area_m2?: number;
};

export class GalatSimulasi extends Error {}
/** `kode` meneruskan kode galat engine (mis. OUT_OF_COVERAGE) agar layar dapat memilih pemulihan. */
export class GalatPemindaian extends Error {
  readonly kode?: string;
  constructor(pesan: string, kode?: string) {
    super(pesan);
    this.kode = kode;
  }
}
export class GalatAgregasi extends Error {}

export async function hitungAgregasi(permintaan: PermintaanAgregasi, signal?: AbortSignal): Promise<HasilAgregasi> {
  const masukan = PermintaanAgregasi.parse(permintaan);
  const timeout = AbortSignal.timeout(30_000);
  let response: Response;
  try {
    response = await fetch(`${API_BASE}/api/v1/aggregate`, {
      method: "POST",
      signal: signal ? AbortSignal.any([signal, timeout]) : timeout,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(masukan),
    });
  } catch (error) {
    if (signal?.aborted) throw error;
    throw new GalatAgregasi(timeout.aborted ? "Waktu hitung melewati 30 detik. Coba lagi." : "Mesin belum dapat dihubungi. Periksa jaringan lalu coba lagi.");
  }
  if (!response.ok) {
    const data = GalatApi.safeParse(await response.json().catch(() => null));
    throw new GalatAgregasi(data.success ? data.data.error.message : "Agregasi belum dapat dihitung. Coba lagi.");
  }
  const hasil = HasilAgregasi.safeParse(await response.json().catch(() => null));
  if (!hasil.success) throw new GalatAgregasi("Hasil agregasi tidak valid.");
  if (JSON.stringify(hasil.data.permintaan) !== JSON.stringify(masukan)) {
    throw new GalatAgregasi("Hasil agregasi tidak cocok dengan skenario pilihan.");
  }
  return hasil.data;
}

async function bacaRespons(response: Response): Promise<unknown> {
  if (!response.ok) {
    const data = GalatApi.safeParse(await response.json().catch(() => null));
    throw new GalatPemindaian(data.success ? data.data.error.message : "Layanan belum dapat dihubungi. Coba lagi.", data.success ? data.data.error.code : undefined);
  }
  return response.json();
}

/** Footprint snapshot kota yang memotong bbox peta; dibatalkan saat peta bergerak lagi. */
// Geocoder dipanggil hanya saat kueri dikirim; engine menjeda dan menyimpan hasilnya.
// `pusat` [bujur, lintang] hanya mengutamakan hasil di sekitar pusat peta; engine tetap membatasi ke Indonesia.
export async function cariAlamat(q: string, signal?: AbortSignal, pusat?: readonly [number, number]): Promise<PencarianAlamat> {
  const masukan = PermintaanAlamat.parse(pusat ? { q, lon: pusat[0], lat: pusat[1] } : { q });
  const timeout = AbortSignal.timeout(15_000);
  const kueri = new URLSearchParams(Object.entries(masukan).map(([kunci, nilai]) => [kunci, String(nilai)]));
  const response = await fetch(`${API_BASE}/api/v1/alamat?${kueri}`, { signal: signal ? AbortSignal.any([signal, timeout]) : timeout });
  const hasil = PencarianAlamat.safeParse(await bacaRespons(response));
  if (!hasil.success) throw new GalatPemindaian("Hasil pencarian alamat tidak valid.");
  return hasil.data;
}

/** Footprint area beserta cakupannya: `langsung` bila dibaca dari OSM (jendela kecil), `dimuat` = [barat, selatan, timur, utara]. */
export type FootprintAreaDimuat = FootprintArea & { cakupan: CakupanArea };

export async function muatFootprintArea(permintaan: PermintaanFootprintArea, signal?: AbortSignal): Promise<FootprintAreaDimuat> {
  const masukan = PermintaanFootprintArea.parse(permintaan);
  const q = new URLSearchParams(Object.entries(masukan).map(([kunci, nilai]) => [kunci, String(nilai)]));
  // Di luar Kota Bengkulu engine membaca OpenStreetMap langsung, yang bisa lebih lambat dari snapshot.
  const timeout = AbortSignal.timeout(30_000);
  const response = await fetch(`${API_BASE}/api/v1/footprints?${q}`, { signal: signal ? AbortSignal.any([signal, timeout]) : timeout });
  const hasil = FootprintArea.safeParse(await bacaRespons(response));
  if (!hasil.success) throw new GalatPemindaian("Data bangunan area ini tidak valid.");
  const d = hasil.data;
  const a = d.area_dimuat;
  return { ...d, cakupan: { langsung: d.jenis_sumber === "osm_daring", dimuat: a ? [a.barat, a.selatan, a.timur, a.utara] : null } };
}

/** Provinsi dan faktor emisi jaringan di titik; di luar Indonesia engine menjawab OUT_OF_COVERAGE. */
export async function muatWilayah(lat: number, lon: number, signal?: AbortSignal): Promise<InfoWilayah> {
  const timeout = AbortSignal.timeout(8_000);
  const response = await fetch(`${API_BASE}/api/v1/wilayah?${new URLSearchParams({ lat: String(lat), lon: String(lon) })}`, { signal: signal ? AbortSignal.any([signal, timeout]) : timeout });
  const hasil = InfoWilayah.safeParse(await bacaRespons(response));
  if (!hasil.success) throw new GalatPemindaian("Data wilayah tidak valid.");
  return hasil.data;
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
