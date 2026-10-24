import { describe, expect, it } from "vitest";
import { BangunanRingkas } from "./bangunan.ts";
import { AreaDimuat, FootprintArea, JenisSumberFootprint, PermintaanFootprintArea } from "./footprint.ts";
import rumah from "../../../data/fixtures/bangunan/rumah-kandang-limun.json";

const bbox = { barat: 102.26, selatan: -3.77, timur: 102.27, utara: -3.76 };

describe("PermintaanFootprintArea", () => {
  it("memberi batas jumlah awal dan menolak batas di luar 1–2000", () => {
    expect(PermintaanFootprintArea.parse(bbox).batas).toBe(1500);
    for (const batas of [0, 2001, 1.5]) expect(PermintaanFootprintArea.safeParse({ ...bbox, batas }).success).toBe(false);
  });

  it("menolak koordinat di luar WGS84 dan nilai non-finite", () => {
    for (const [kolom, nilai] of [["barat", -181], ["timur", 181], ["selatan", -91], ["utara", NaN]] as const) {
      expect(PermintaanFootprintArea.safeParse({ ...bbox, [kolom]: nilai }).success).toBe(false);
    }
  });
});

describe("FootprintArea", () => {
  const data = {
    permintaan: { ...bbox, batas: 1500 },
    jumlah: 1,
    terpotong: false,
    bangunan: [{ ...rumah, building_tag: "yes", perkiraan_jenis: "rumah" }],
    perkiraan_rumah: { min_m2: 56.3, max_m2: 372.3, dasar: "Persentil luas footprint bertag building=house" },
    sumber: { penerbit: "OpenStreetMap contributors", url: "https://overpass-api.de/api/interpreter", diambil: "2026-10-14", timestamp_osm: "2026-10-14T16:04:41Z", catatan: "Snapshot" },
  };

  it("membawa perkiraan jenis terpisah dari tag OSM", () => {
    const hasil = FootprintArea.parse(data);
    expect(hasil.bangunan[0].building_tag).toBe("yes");
    expect(hasil.bangunan[0].perkiraan_jenis).toBe("rumah");
  });

  it("menolak perkiraan jenis lain dan jumlah negatif", () => {
    expect(FootprintArea.safeParse({ ...data, bangunan: [{ ...data.bangunan[0], perkiraan_jenis: "toko" }] }).success).toBe(false);
    expect(FootprintArea.safeParse({ ...data, jumlah: -1 }).success).toBe(false);
  });

  it("tetap menerima bangunan lama tanpa perkiraan jenis", () => {
    expect(BangunanRingkas.parse(rumah).perkiraan_jenis).toBeUndefined();
  });

  it("menerima respons snapshot lama tanpa penanda sumber dan area dimuat", () => {
    const hasil = FootprintArea.parse(data);
    expect(hasil.jenis_sumber).toBeUndefined();
    expect(hasil.area_dimuat).toBeUndefined();
  });

  it("menerima footprint OSM daring tanpa perkiraan rumah, dengan jendela yang dimuat", () => {
    const { perkiraan_rumah: _, ...dasar } = data;
    const daring = {
      ...dasar,
      bangunan: [{ ...rumah, building_tag: "yes" }],
      jenis_sumber: "osm_daring",
      area_dimuat: { barat: 106.824, selatan: -6.178, timur: 106.830, utara: -6.172 },
    };
    const hasil = FootprintArea.parse(daring);
    expect(hasil.perkiraan_rumah).toBeUndefined();
    expect(hasil.bangunan[0].perkiraan_jenis).toBeUndefined();
    expect(hasil.jenis_sumber).toBe("osm_daring");
    expect(hasil.area_dimuat?.timur).toBeGreaterThan(hasil.area_dimuat?.barat ?? 0);
  });

  it("menolak jenis sumber lain dan area dimuat di luar WGS84", () => {
    expect(JenisSumberFootprint.safeParse("cache").success).toBe(false);
    expect(FootprintArea.safeParse({ ...data, jenis_sumber: "tebakan" }).success).toBe(false);
    expect(AreaDimuat.safeParse({ barat: 106.8, selatan: -91, timur: 106.9, utara: -6.1 }).success).toBe(false);
  });
});
