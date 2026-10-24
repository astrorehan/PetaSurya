import type { CuacaSimulasi } from "@petasurya/contracts";

const DERAJAT = new Intl.NumberFormat("id-ID", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/** Satu baris di bawah angka produksi; hasil lama tanpa `cuaca` tetap terbaca. */
export function keteranganCuaca(cuaca?: CuacaSimulasi): string {
  return cuaca ? `kWh/tahun · cuaca ${cuaca.tahun} di lokasi bangunan` : "kWh/tahun · cuaca acuan";
}

/** Titik cuaca untuk lembar "Cara hitung": tahun, sumber, dan koordinat yang diminta. */
export function barisCuaca(cuaca?: CuacaSimulasi): [string, string][] {
  if (!cuaca) return [];
  return [
    ["Data cuaca", `${cuaca.tahun} · ${cuaca.sumber}`],
    ["Titik cuaca", `${DERAJAT.format(Math.abs(cuaca.lat))}° ${cuaca.lat < 0 ? "LS" : "LU"}, ${DERAJAT.format(Math.abs(cuaca.lon))}° ${cuaca.lon < 0 ? "BB" : "BT"}`],
  ];
}
