import { describe, expect, it } from "vitest";
import { PermintaanAgregasi, RingkasanAgregasi } from "./agregasi.ts";
import simulasi from "../../../data/fixtures/simulasi/contoh-unib-1146141501.json";

const masukan = {
  kode_wilayah: "1771",
  fraksi_layak: 0.7,
  tilt_deg: 15,
  azimuth_deg: 0,
  adopsi: 0.15,
  urut: "kwp",
  asumsi: simulasi.asumsi,
  parameter_fisika: simulasi.parameter_fisika,
};

describe("PermintaanAgregasi", () => {
  it("mewajibkan asumsi area, orientasi, adopsi dan parameter fisika", () => {
    expect(PermintaanAgregasi.safeParse(masukan).success).toBe(true);
    for (const kolom of ["fraksi_layak", "tilt_deg", "azimuth_deg", "adopsi", "urut", "asumsi", "parameter_fisika"]) {
      expect(PermintaanAgregasi.safeParse({ ...masukan, [kolom]: undefined }).success).toBe(false);
    }
  });

  it("menerima adopsi nol/penuh dan menolak fraksi, wilayah serta angka non-finite yang salah", () => {
    for (const adopsi of [0, 1]) expect(PermintaanAgregasi.safeParse({ ...masukan, adopsi }).success).toBe(true);
    for (const nilai of [-0.1, 1.1, NaN, Infinity]) {
      for (const kolom of ["adopsi", "fraksi_layak"]) {
        expect(PermintaanAgregasi.safeParse({ ...masukan, [kolom]: nilai }).success).toBe(false);
      }
    }
    expect(PermintaanAgregasi.safeParse({ ...masukan, kode_wilayah: "9999" }).success).toBe(false);
    expect(PermintaanAgregasi.safeParse({ ...masukan, urut: "acak" }).success).toBe(false);
    expect(PermintaanAgregasi.safeParse({ ...masukan, asumsi: { ...masukan.asumsi, umur_tahun: 0 } }).success).toBe(false);
  });
});

describe("RingkasanAgregasi", () => {
  it("menerima hasil kosong tanpa mengubah payback null menjadi nol", () => {
    const kosong = { n_bangunan: 0, module_count: 0, footprint_m2: 0, usable_area_m2: 0, kwp: 0, e_ac_kwh_yr1: 0, co2_ton_yr1: 0, capex_idr: 0, savings_idr_yr1: 0, payback_median_years: null };
    expect(RingkasanAgregasi.parse(kosong).payback_median_years).toBeNull();
    expect(RingkasanAgregasi.safeParse({ ...kosong, kwp: -1 }).success).toBe(false);
  });
});
