import { z } from "zod";

// Kontrak L3–L5 (cetak biru §03). Nama kunci = kolom tabel `simulations`
// supaya hasil tersimpan dan respons API punya bentuk yang sama.

export const AsumsiSimulasi = z.object({
  golongan_tarif: z.string().describe("Golongan tarif PLN, mis. 'R-1/TR'"),
  daya_va: z.number().int().positive().describe("Daya tersambung, VA"),
  tarif_rp_kwh: z.number().positive().describe("Tarif yang dipakai dalam skenario, Rp/kWh"),
  scr: z.number().min(0).max(1).describe("Self-consumption ratio, fraksi 0–1"),
  biaya_per_kwp: z.number().positive().describe("Biaya terpasang, Rp/kWp"),
  opex_frac: z.number().min(0).max(0.1).default(0.01).describe("O&M per tahun, fraksi capex"),
  diskonto: z.number().min(0).max(0.3).default(0.09).describe("Tingkat diskonto nominal, fraksi"),
  eskalasi_tarif: z.number().min(0).max(0.2).default(0).describe("Kenaikan tarif per tahun, fraksi"),
  degradasi_thn: z.number().min(0).max(0.02).default(0.006).describe("Degradasi modul per tahun, fraksi"),
  umur_tahun: z.number().int().default(25).describe("Umur sistem, tahun"),
  ef_grid_tco2_mwh: z.number().positive().describe("Faktor emisi jaringan, tCO2e/MWh"),
  faktor_ekspor: z
    .number()
    .min(0)
    .max(1)
    .default(0)
    .describe("Nilai ekspor relatif terhadap tarif; 0 bila net-metering dihapus"),
});

// Jejak perhitungan: rumus dan sumber tiap angka (cetak biru §04).
// Ditampilkan sebagai "lihat cara hitung" di antarmuka.
export const JejakRumus = z.object({
  rumus: z.string(),
  sumber: z.string(),
});

export const ModulSimulasi = z.object({
  wp: z.number().positive().describe("Daya puncak modul, Wp"),
  panjang_m: z.number().positive().describe("Panjang modul, meter"),
  lebar_m: z.number().positive().describe("Lebar modul, meter"),
  gamma_p: z.number().max(0).describe("Koefisien suhu daya, 1/°C"),
  t_noct: z.number().positive().describe("Nominal Operating Cell Temperature, °C"),
});

export const DerateSimulasi = z.object({
  kotoran: z.number().min(0).max(1).describe("Rugi kotoran, fraksi"),
  mismatch: z.number().min(0).max(1).describe("Rugi mismatch modul, fraksi"),
  kabel_dc: z.number().min(0).max(1).describe("Rugi kabel DC, fraksi"),
  inverter: z.number().min(0).max(1).describe("Efisiensi inverter, fraksi (bukan rugi)"),
  ketersediaan: z.number().min(0).max(1).describe("Rugi ketersediaan, fraksi"),
});

export const ParameterFisika = z.object({
  modul: ModulSimulasi,
  derate: DerateSimulasi,
  albedo: z.number().min(0).max(1).describe("Reflektansi permukaan tanah, fraksi"),
});

export const JejakDerate = z.object({
  kotoran: z.number().min(0).max(1).describe("Rugi kotoran, fraksi"),
  mismatch: z.number().min(0).max(1).describe("Rugi mismatch modul, fraksi"),
  kabel_dc: z.number().min(0).max(1).describe("Rugi kabel DC, fraksi"),
  inverter: z.number().min(0).max(1).describe("Efisiensi inverter, fraksi (bukan rugi)"),
  ketersediaan: z.number().min(0).max(1).describe("Rugi ketersediaan, fraksi"),
  gabungan: z.number().min(0).max(1).describe("Hasil perkalian faktor derate; terpisah dari PR energi"),
});

export const JejakSimulasi = z.object({
  poa: JejakRumus,
  suhu_sel: JejakRumus,
  derate: JejakDerate,
  ekonomi: JejakRumus.optional().describe("Rumus dan sumber tarif serta biaya yang cocok dengan masukan"),
  karbon: JejakRumus.optional().describe("Sumber, tahun data dan metode faktor emisi yang dipakai"),
});

export const HasilSimulasi = z.object({
  id: z.string().describe("UUID simulasi"),
  engine_version: z
    .string()
    .describe("Gabungan VERSION tiap lapisan, mis. 'l3.2026.09.14+l4.2026.09.20'"),
  kwp: z.number().describe("Kapasitas DC terpasang, kWp"),
  module_count: z.number().int(),
  poa_kwh_m2_yr: z.number().describe("Iradiasi bidang modul, kWh/m²/tahun"),
  e_ac_kwh_yr1: z.number().describe("Energi AC tahun pertama, kWh"),
  pr: z.number().describe("Performance ratio, fraksi"),
  scr: z.number().describe("Self-consumption ratio yang dipakai, fraksi"),
  capex_idr: z.number().describe("Investasi awal, Rp"),
  savings_idr_yr1: z.number().describe("Penghematan tagihan tahun pertama, Rp"),
  payback_years: z.number().nullable().describe("null = tidak balik modal dalam umur sistem"),
  npv_idr: z.number().describe("Nilai kini bersih, Rp"),
  irr: z.number().nullable().describe("null = tidak konvergen"),
  lcoe_idr_kwh: z.number().describe("Biaya energi rata-rata, Rp/kWh"),
  co2e_ton_yr: z.number().describe("Emisi terhindar tahun pertama, tCO2e"),
  co2e_ton_25yr: z.number().describe("Emisi terhindar sepanjang umur, tCO2e"),
  monthly_kwh: z.array(z.number()).length(12).describe("Energi AC per bulan Jan–Des, kWh"),
  asumsi: AsumsiSimulasi,
  jejak: JejakSimulasi.optional(),
  parameter_fisika: ParameterFisika.optional().describe("Masukan fisika yang dipakai untuk reproduksi hasil"),
});

export type AsumsiSimulasi = z.infer<typeof AsumsiSimulasi>;
export type HasilSimulasi = z.infer<typeof HasilSimulasi>;
export type JejakSimulasi = z.infer<typeof JejakSimulasi>;
export type ParameterFisika = z.infer<typeof ParameterFisika>;
