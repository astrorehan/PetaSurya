import { describe, expect, it } from "vitest";
import { bacaTagihan, bandingTagihan, formatIsianTagihan } from "./tagihan";

describe("bacaTagihan", () => {
  it("membaca angka dengan pemisah ribuan dan awalan Rp", () => {
    expect(bacaTagihan("1.500.000")).toBe(1_500_000);
    expect(bacaTagihan("Rp 750000")).toBe(750_000);
  });

  it("menolak kosong dan nol", () => {
    expect(bacaTagihan("")).toBeNull();
    expect(bacaTagihan(undefined)).toBeNull();
    expect(bacaTagihan("0")).toBeNull();
    expect(bacaTagihan("abc")).toBeNull();
  });
});

describe("formatIsianTagihan", () => {
  it("memberi pemisah ribuan id-ID dan membuang nol di depan", () => {
    expect(formatIsianTagihan("001500000")).toBe("1.500.000");
    expect(formatIsianTagihan("")).toBe("");
  });
});

describe("bandingTagihan", () => {
  it("mengurangi tagihan dengan seperdua belas penghematan tahunan", () => {
    // 24 jt/tahun hemat → 2 jt/bulan; tagihan 5 jt → 3 jt.
    const h = bandingTagihan({ tagihanBulanan: 5_000_000, hematTahunan: 24_000_000, tarifRpKwh: 1_000, eAcKwhTahunan: 28_235, scr: 0.85 });
    expect(h.dengan).toBeCloseTo(3_000_000);
    expect(h.hemat).toBeCloseTo(2_000_000);
    expect(h.turun).toBeCloseTo(0.4);
    expect(h.pemakaianKwh).toBeCloseTo(5_000);
    expect(h.melebihi).toBe(false);
  });

  it("tidak membuat tagihan negatif dan menandai asumsi SCR yang melebihi pemakaian", () => {
    const h = bandingTagihan({ tagihanBulanan: 500_000, hematTahunan: 24_000_000, tarifRpKwh: 1_000, eAcKwhTahunan: 28_235, scr: 0.85 });
    expect(h.dengan).toBe(0);
    expect(h.hemat).toBe(500_000);
    expect(h.turun).toBe(1);
    expect(h.melebihi).toBe(true);
  });
});
