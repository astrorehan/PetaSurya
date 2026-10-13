import { describe, expect, it } from "vitest";
import { DAFTAR_BANGUNAN, TAHAP_INFO } from "../components/pemindaiData";
import demo from "../../../data/fixtures/demo.json";

describe("Pemindai — hasil inferensi tersimpan", () => {
  it("memuat sembilan bangunan nyata dan kedua metode analisis", () => {
    expect(DAFTAR_BANGUNAN).toHaveLength(9);
    expect(new Set(DAFTAR_BANGUNAN.map((b) => b.id)).size).toBe(9);
    expect(DAFTAR_BANGUNAN.filter((b) => b.method === "cv")).toHaveLength(5);
    expect(DAFTAR_BANGUNAN.filter((b) => b.method === "footprint_fallback")).toHaveLength(4);
  });
  it("tidak menggambar mask atau objek rekaan pada fallback", () => {
    for (const b of DAFTAR_BANGUNAN) {
      expect(b.obstructions).toEqual([]);
      expect(b.ridges).toEqual([]);
      if (b.method === "footprint_fallback") {
        expect(b.mask_rings).toEqual([]);
        expect(b.peringatan).toBeTruthy();
      } else {
        expect(b.mask_rings.length).toBeGreaterThan(0);
        expect(b.iou_footprint).toBeGreaterThan(0.5);
      }
    }
  });
  it("angka dan kontur berasal dari paket demo yang sama", () => {
    for (const b of DAFTAR_BANGUNAN) {
      const data = demo.find((d) => d.bangunan.id === b.id)!;
      expect(b.roof_area_m2).toBe(data.analisis.roof_area_m2);
      expect(b.mask_rings).toEqual(data.viewer.mask_rings);
      expect(b.specs[550].count).toBe(data.simulasi.module_count);
      expect(b.specs[550].kwp).toBe(data.simulasi.kwp);
      expect(b.specs[550].e_ac_kwh_yr1).toBe(data.simulasi.e_ac_kwh_yr1);
      expect(b.luas_modul_m2).toBe(data.simulasi.parameter_fisika.modul.panjang_m * data.simulasi.parameter_fisika.modul.lebar_m);
      expect(data.viewer.evaluasi.sha256_citra_rgb).toMatch(/^[a-f0-9]{64}$/);
    }
  });
  it("kontur WGS84 dan kontur kanvas punya komponen serta lubang yang sama", () => {
    for (const d of demo.filter((data) => data.analisis.mask_geojson)) {
      const geo = d.analisis.mask_geojson!.coordinates;
      expect(d.viewer.mask_rings).toHaveLength(geo.length);
      d.viewer.mask_rings.forEach((rings, i) => {
        expect(rings).toHaveLength(geo[i].length);
        rings.forEach((ring) => {
          expect(ring[0]).toEqual(ring.at(-1));
          for (const [x, y] of ring) {
            expect(x).toBeGreaterThanOrEqual(0);
            expect(x).toBeLessThanOrEqual(640);
            expect(y).toBeGreaterThanOrEqual(0);
            expect(y).toBeLessThanOrEqual(480);
          }
        });
      });
    }
  });
  it("tile memiliki georeferensi dan atribusi daring, bukan aset hasil unduhan", () => {
    for (const b of DAFTAR_BANGUNAN) {
      expect(b.tiles.length).toBeGreaterThanOrEqual(6);
      for (const t of b.tiles) expect(t.url).toMatch(/^https:\/\/server\.arcgisonline\.com\/.*\/tile\/19\/\d+\/\d+$/);
    }
  });
  it("kelima tahap menyampaikan batas pengukuran", () => {
    expect(TAHAP_INFO.map((t) => t.nomor)).toEqual([1, 2, 3, 4, 5]);
    expect(TAHAP_INFO[2].penjelasan).toContain("belum diukur");
    expect(TAHAP_INFO[3].penjelasan).toContain("asumsi");
    expect(TAHAP_INFO[4].penjelasan).toContain("modul setara");
  });
});
