import { describe, expect, it } from "vitest";
import { DAFTAR_BANGUNAN, TAHAP_INFO } from "../components/pemindaiData";
import tokoFixture from "../../../data/fixtures/bangunan/toko-wr-supratman.json";
import unibFixture from "../../../data/fixtures/bangunan/kampus-fh-unib.json";
import limunFixture from "../../../data/fixtures/bangunan/rumah-kandang-limun.json";
import tokoCvFixture from "../../../data/fixtures/analisis/cv-toko-wr-supratman.json";
import unibCvFixture from "../../../data/fixtures/analisis/cv-kampus-fh-unib.json";
import limunFallbackFixture from "../../../data/fixtures/analisis/fallback-rumah-kandang-limun.json";
import simTokoFixture from "../../../data/fixtures/simulasi/contoh-3f8c.json";
import simUnibFixture from "../../../data/fixtures/simulasi/contoh-unib-1146141501.json";
import simLimunFixture from "../../../data/fixtures/simulasi/contoh-limun-1145010599.json";

describe("Instrumen PemindaiAtap — Integritas Data & Pipeline", () => {
  it("mendefinisikan 5 tahap berurutan 1 sampai 5", () => {
    expect(TAHAP_INFO).toHaveLength(5);
    TAHAP_INFO.forEach((t, i) => {
      expect(t.nomor).toBe(i + 1);
      expect(t.nama.length).toBeGreaterThan(0);
      expect(t.subjudul.length).toBeGreaterThan(0);
      expect(t.penjelasan.length).toBeGreaterThan(20);
    });
  });

  it("memiliki 3 bangunan target nyata terkalibrasi", () => {
    expect(DAFTAR_BANGUNAN).toHaveLength(3);
    const ids = DAFTAR_BANGUNAN.map((b) => b.id);
    expect(ids).toContain(991016391); // Toko WR Supratman
    expect(ids).toContain(1146141501); // FH UNIB
    expect(ids).toContain(1145010599); // Rumah Kandang Limun
  });

  it("koordinat bangunan konsisten dengan fixture OSM Bengkulu", () => {
    const toko = DAFTAR_BANGUNAN.find((b) => b.id === 991016391)!;
    const unib = DAFTAR_BANGUNAN.find((b) => b.id === 1146141501)!;
    const limun = DAFTAR_BANGUNAN.find((b) => b.id === 1145010599)!;

    // Bengkulu latitude sekitar -3.76, longitude sekitar 102.26
    for (const b of [toko, unib, limun]) {
      expect(b.koordinat[0]).toBeLessThan(-3.7);
      expect(b.koordinat[0]).toBeGreaterThan(-3.9);
      expect(b.koordinat[1]).toBeGreaterThan(102.2);
      expect(b.koordinat[1]).toBeLessThan(102.35);
    }

    expect(toko.footprint_m2).toBe(tokoFixture.footprint_m2);
    expect(unib.footprint_m2).toBe(unibFixture.footprint_m2);
    expect(limun.footprint_m2).toBe(limunFixture.footprint_m2);
  });

  it("setiap bangunan memiliki multi-tile citra satelit z=19 yang valid", () => {
    for (const b of DAFTAR_BANGUNAN) {
      expect(b.tiles.length).toBeGreaterThanOrEqual(8);
      for (const t of b.tiles) {
        expect(t.url).toMatch(/^https:\/\/server\.arcgisonline\.com\/.*\/tile\/19\/\d+\/\d+$/);
      }
    }
  });

  it("poligon kontur berada dalam batas canvas 640x480 dan dicakup oleh bbox", () => {
    for (const b of DAFTAR_BANGUNAN) {
      expect(b.polygon.length).toBeGreaterThanOrEqual(4);
      const [bx, by, bw, bh] = b.bbox;
      expect(bw).toBeGreaterThan(0);
      expect(bh).toBeGreaterThan(0);

      for (const [px, py] of b.polygon) {
        expect(px).toBeGreaterThanOrEqual(0);
        expect(px).toBeLessThanOrEqual(640);
        expect(py).toBeGreaterThanOrEqual(0);
        expect(py).toBeLessThanOrEqual(480);

        // Bbox harus mencakup poligon (dengan margin)
        expect(px).toBeGreaterThanOrEqual(bx - 12);
        expect(px).toBeLessThanOrEqual(bx + bw + 12);
        expect(py).toBeGreaterThanOrEqual(by - 12);
        expect(py).toBeLessThanOrEqual(by + bh + 12);
      }
    }
  });

  it("vektor azimut dan tilt berada pada rentang fisika atap yang valid", () => {
    for (const b of DAFTAR_BANGUNAN) {
      expect(b.azimuth_deg).toBeGreaterThanOrEqual(0);
      expect(b.azimuth_deg).toBeLessThan(360);
      expect(b.tilt_deg).toBeGreaterThanOrEqual(10);
      expect(b.tilt_deg).toBeLessThanOrEqual(45);
      expect(b.ridges.length).toBeGreaterThanOrEqual(1);

      const [x1, y1, x2, y2] = b.azimuth_vec;
      expect(x1).toBeGreaterThanOrEqual(0);
      expect(x1).toBeLessThanOrEqual(640);
      expect(y1).toBeGreaterThanOrEqual(0);
      expect(y1).toBeLessThanOrEqual(480);
      expect(x2).toBeGreaterThanOrEqual(0);
      expect(x2).toBeLessThanOrEqual(640);
      expect(y2).toBeGreaterThanOrEqual(0);
      expect(y2).toBeLessThanOrEqual(480);
    }
  });

  it("spesifikasi modul 550 Wp dan 440 Wp terdefinisi dengan relasi proporsional", () => {
    for (const b of DAFTAR_BANGUNAN) {
      const s550 = b.specs[550];
      const s440 = b.specs[440];

      expect(s550.count).toBeGreaterThan(0);
      expect(s550.kwp).toBeGreaterThan(0);
      expect(s550.e_ac_kwh_yr1).toBeGreaterThan(0);
      expect(s550.savings_idr_yr1).toBeGreaterThan(0);

      expect(s440.count).toBeGreaterThan(0);
      expect(s440.kwp).toBeGreaterThan(0);
      expect(s440.e_ac_kwh_yr1).toBeGreaterThan(0);
      expect(s440.savings_idr_yr1).toBeGreaterThan(0);

      // Modul 440Wp lebih kecil fisiknya, sehingga jumlahnya lebih banyak
      expect(s440.count).toBeGreaterThanOrEqual(s550.count);
    }
  });

  it("log inferensi CV mencakup seluruh 5 tahap untuk setiap bangunan", () => {
    for (const b of DAFTAR_BANGUNAN) {
      const tahapDiLog = new Set(b.cv_logs.map((l) => l.tahap));
      expect(tahapDiLog.has(1)).toBe(true);
      expect(tahapDiLog.has(2)).toBe(true);
      expect(tahapDiLog.has(3)).toBe(true);
      expect(tahapDiLog.has(4)).toBe(true);
      expect(tahapDiLog.has(5)).toBe(true);
    }
  });

  it("analisis dan simulasi fixture selaras dengan data pemindai", () => {
    const toko = DAFTAR_BANGUNAN.find((b) => b.id === 991016391)!;
    expect(toko.roof_area_m2).toBe(tokoCvFixture.roof_area_m2);
    expect(toko.usable_area_m2).toBe(tokoCvFixture.usable_area_m2);
    expect(toko.tilt_deg).toBe(tokoCvFixture.tilt_deg);
    expect(toko.azimuth_deg).toBe(tokoCvFixture.azimuth_deg);
    expect(toko.confidence).toBe(tokoCvFixture.confidence);
    expect(toko.specs[550].kwp).toBe(simTokoFixture.kwp);
    expect(toko.specs[550].count).toBe(simTokoFixture.module_count);

    const unib = DAFTAR_BANGUNAN.find((b) => b.id === 1146141501)!;
    expect(unib.roof_area_m2).toBe(unibCvFixture.roof_area_m2);
    expect(unib.usable_area_m2).toBe(unibCvFixture.usable_area_m2);
    expect(unib.specs[550].kwp).toBe(simUnibFixture.kwp);
    expect(unib.specs[550].count).toBe(simUnibFixture.module_count);

    const limun = DAFTAR_BANGUNAN.find((b) => b.id === 1145010599)!;
    expect(limun.roof_area_m2).toBe(limunFallbackFixture.roof_area_m2);
    expect(limun.usable_area_m2).toBe(limunFallbackFixture.usable_area_m2);
    expect(limun.specs[550].kwp).toBe(simLimunFixture.kwp);
    expect(limun.specs[550].count).toBe(simLimunFixture.module_count);
  });
});
