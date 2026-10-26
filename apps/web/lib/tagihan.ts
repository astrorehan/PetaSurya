/**
 * Perbandingan tagihan listrik bulanan tanpa dan dengan PLTS.
 *
 * Tagihan sekarang berasal dari pengguna; mesin hanya mengetahui produksi,
 * porsi terpakai sendiri (SCR) dan tarif. Model tagihan linier:
 *   pemakaian [kWh/bulan] = tagihan / tarif
 *   tagihan_dengan = max(0, tagihan − hemat_tahun_1 / 12)
 * Biaya beban, rekening minimum dan variasi musiman tidak dimodelkan.
 */

export type BandingTagihan = {
  /** Tagihan rata-rata tanpa PLTS, Rp/bulan. */
  tanpa: number;
  /** Tagihan rata-rata dengan PLTS, Rp/bulan, tidak kurang dari nol. */
  dengan: number;
  /** Selisih tanpa − dengan, Rp/bulan. */
  hemat: number;
  /** hemat / tanpa, 0–1. */
  turun: number;
  /** Pemakaian tersirat dari tagihan, kWh/bulan. */
  pemakaianKwh: number;
  /** Produksi yang diasumsikan terpakai sendiri, kWh/bulan. */
  terpakaiKwh: number;
  /** true bila produksi terpakai sendiri melebihi pemakaian; asumsi SCR tidak konsisten. */
  melebihi: boolean;
};

/** "1.500.000", "Rp 1500000" → 1500000; kosong atau nol → null. */
export function bacaTagihan(teks: string | null | undefined): number | null {
  if (!teks) return null;
  const digit = teks.replace(/\D/g, "");
  if (!digit) return null;
  const nilai = Number(digit);
  return Number.isSafeInteger(nilai) && nilai > 0 ? nilai : null;
}

/** Digit mentah → tampilan isian id-ID: "1500000" → "1.500.000". */
export function formatIsianTagihan(teks: string): string {
  const digit = teks.replace(/\D/g, "").replace(/^0+/, "").slice(0, 15);
  return digit ? Number(digit).toLocaleString("id-ID", { maximumFractionDigits: 0 }) : "";
}

export function bandingTagihan({
  tagihanBulanan,
  hematTahunan,
  tarifRpKwh,
  eAcKwhTahunan,
  scr,
}: {
  tagihanBulanan: number;
  hematTahunan: number;
  tarifRpKwh: number;
  eAcKwhTahunan: number;
  scr: number;
}): BandingTagihan {
  const hematBulanan = Math.max(0, hematTahunan) / 12;
  const dengan = Math.max(0, tagihanBulanan - hematBulanan);
  const hemat = tagihanBulanan - dengan;
  const pemakaianKwh = tarifRpKwh > 0 ? tagihanBulanan / tarifRpKwh : 0;
  const terpakaiKwh = (eAcKwhTahunan * scr) / 12;
  return {
    tanpa: tagihanBulanan,
    dengan,
    hemat,
    turun: tagihanBulanan > 0 ? hemat / tagihanBulanan : 0,
    pemakaianKwh,
    terpakaiKwh,
    melebihi: terpakaiKwh > pemakaianKwh * 1.001,
  };
}
