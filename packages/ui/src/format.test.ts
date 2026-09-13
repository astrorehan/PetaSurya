import { describe, expect, it } from "vitest";
import { kwh, kwp, m2, persen, rupiah, tahun, ton } from "./format";

// Pemisah ribuan id-ID adalah titik, desimal koma. Intl di Node memakai
// spasi tak-terputus (U+00A0) antara "Rp" dan angka; dinormalkan agar tes
// tidak rapuh terhadap versi ICU.
const nbsp = (s: string) => s.replace(/ /g, " ");

describe("rupiah", () => {
  it("presisi penuh tanpa desimal", () => {
    expect(nbsp(rupiah(12118000))).toBe("Rp 12.118.000");
  });
  it("ringkas ≥ 1 juta", () => {
    expect(rupiah(12118000, true)).toBe("Rp 12,1 juta");
  });
  it("ringkas ≥ 1 miliar", () => {
    expect(rupiah(1_250_000_000, true)).toBe("Rp 1,3 miliar");
  });
  it("ringkas < 1 juta tetap penuh", () => {
    expect(nbsp(rupiah(850000, true))).toBe("Rp 850.000");
  });
});

describe("satuan", () => {
  it("kwh membulatkan ke satuan", () => {
    expect(kwh(19840.4)).toBe("19.840 kWh");
  });
  it("kwp dua desimal", () => {
    expect(kwp(14.3)).toBe("14,3 kWp");
    expect(kwp(14.256)).toBe("14,26 kWp");
  });
  it("ton dua desimal dengan tCO₂e", () => {
    expect(ton(15.876)).toBe("15,88 tCO₂e");
  });
  it("m2 tanpa desimal", () => {
    expect(m2(96.7)).toBe("97 m²");
  });
  it("persen dari rasio", () => {
    expect(persen(0.42)).toBe("42%");
    expect(persen(0.8134)).toBe("81,3%");
  });
});

describe("tahun", () => {
  it("satu desimal di bawah umur sistem", () => {
    expect(tahun(11.43)).toBe("11,4 tahun");
  });
  it("tepat 25 tahun masih angka", () => {
    expect(tahun(25)).toBe("25 tahun");
  });
  it("di atas 25 tahun jadi kalimat, bukan angka", () => {
    expect(tahun(30)).toBe("lebih dari 25 tahun");
    expect(tahun(25.01)).toBe("lebih dari 25 tahun");
  });
});
