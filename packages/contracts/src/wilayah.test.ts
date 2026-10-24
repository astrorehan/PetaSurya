import { describe, expect, it } from "vitest";
import { InfoWilayah, PermintaanWilayah, StatusFaktorEmisi } from "./wilayah.ts";
import { registri } from "./index.ts";
import grid from "../../../data/fixtures/emisi/grid-2019.json";

const bengkulu = {
  provinsi_iso: "ID-BE",
  provinsi_nama: "Bengkulu",
  sistem_grid: "Sumatera",
  ef_grid_tco2_mwh: 0.84,
  rentang_tco2_mwh: null,
  tahun_data: 2019,
  metode: "CM ex-ante, bobot OM 0,75/BM 0,25 (kolom PLTS); komponen CO2 saja",
  status: "terverifikasi",
  catatan: "sistem antarprovinsi",
  sumber_id: "ef_grid_gatrik_2019",
  sumber_url: "https://gatrik.esdm.go.id/gatrik/gatrik-api//storage/migrasi/download_index/files/96d7c-nilai-fe-grk-sistem-ketenagalistrikan-tahun-2019.pdf",
};

describe("PermintaanWilayah", () => {
  it("menerima koordinat WGS84 dan menolak di luar rentang", () => {
    expect(PermintaanWilayah.parse({ lat: -3.76, lon: 102.27 })).toEqual({ lat: -3.76, lon: 102.27 });
    for (const p of [{ lat: 91, lon: 0 }, { lat: 0, lon: 181 }, { lat: 0 }, { lat: "x", lon: 0 }]) {
      expect(PermintaanWilayah.safeParse(p).success).toBe(false);
    }
  });
});

describe("InfoWilayah", () => {
  it("menerima provinsi bersistem terverifikasi", () => {
    expect(InfoWilayah.parse(bengkulu).ef_grid_tco2_mwh).toBe(0.84);
  });

  it("menerima provinsi tanpa faktor beserta rentang antargrid", () => {
    const tanpa = { ...bengkulu, provinsi_iso: "ID-NT", sistem_grid: null, ef_grid_tco2_mwh: null, rentang_tco2_mwh: [0.58, 1.2], status: "belum_diverifikasi" };
    expect(InfoWilayah.parse(tanpa).rentang_tco2_mwh).toEqual([0.58, 1.2]);
  });

  it("menolak kode ISO, status, faktor, rentang, dan tautan yang tidak valid", () => {
    for (const salah of [
      { provinsi_iso: "BE" },
      { status: "tebakan" },
      { ef_grid_tco2_mwh: 0 },
      { ef_grid_tco2_mwh: -0.1 },
      { rentang_tco2_mwh: [0.58] },
      { sumber_url: "bukan-url" },
    ]) {
      expect(InfoWilayah.safeParse({ ...bengkulu, ...salah }).success).toBe(false);
    }
  });

  it("terdaftar pada registri kontrak", () => {
    for (const nama of ["PermintaanWilayah", "StatusFaktorEmisi", "InfoWilayah"]) expect(registri[nama]).toBeDefined();
  });
});

describe("tabel faktor emisi Gatrik 2019", () => {
  const status = StatusFaktorEmisi.options;
  const sistem = new Map(grid.sistem.map((s) => [s.no, s]));

  it("memuat 154 sistem dan 34 provinsi dengan status yang dikenal", () => {
    expect(grid.sistem).toHaveLength(154);
    expect(grid.pemetaan_provinsi).toHaveLength(34);
    for (const p of grid.pemetaan_provinsi) expect(status).toContain(p.status);
  });

  it("provinsi bersistem selalu menunjuk sistem bernilai, provinsi lain tanpa sistem", () => {
    for (const p of grid.pemetaan_provinsi) {
      if (p.status === "belum_diverifikasi") expect(p.sistem_no).toBeNull();
      else expect(sistem.get(p.sistem_no as number)?.cm_ex_ante_075).toBeGreaterThan(0);
    }
  });

  it("Sumatera 0,84 dan Jamali 0,83 sesuai dokumen", () => {
    expect(sistem.get(125)?.cm_ex_ante_075).toBe(0.84);
    expect(sistem.get(38)?.cm_ex_ante_075).toBe(0.83);
  });
});
