import { describe, expect, it } from "vitest";
import { kwh, kwp, m2, pecahAngka, persen, rupiah, tahun, ton, ucapan } from "./format";

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
  it("ringkas negatif memakai minus tipografis", () => {
    expect(rupiah(-18420000, true)).toBe("−Rp 18,4 juta");
    expect(rupiah(-426083434.7, true)).toBe("−Rp 426,1 juta");
  });
});

describe("pecahAngka", () => {
  it("awalan, angka, akhiran", () => {
    expect(pecahAngka("Rp 12,1 juta")).toEqual({ awal: "Rp", angka: "12,1", akhir: "juta" });
    expect(pecahAngka("19.840 kWh")).toEqual({ awal: "", angka: "19.840", akhir: "kWh" });
    expect(pecahAngka("−Rp 18,4 juta")).toEqual({ awal: "−Rp", angka: "18,4", akhir: "juta" });
  });
  it("kalimat tetap terbaca utuh", () => {
    expect(pecahAngka("lebih dari 25 tahun")).toEqual({ awal: "lebih dari", angka: "25", akhir: "tahun" });
  });
  it("tanpa digit dikembalikan utuh", () => {
    expect(pecahAngka("—")).toEqual({ awal: "", angka: "—", akhir: "" });
  });
});

describe("ucapan", () => {
  it("rupiah dibaca setelah angka", () => {
    expect(ucapan("Rp 12,1 juta")).toBe("12,1 juta rupiah");
    expect(ucapan(rupiah(12118000))).toBe("12.118.000 rupiah");
    expect(ucapan("−Rp 18,4 juta")).toBe("minus 18,4 juta rupiah");
  });
  it("satuan energi dan emisi dieja utuh", () => {
    expect(ucapan("14,3 kWp")).toBe("14,3 kilowatt-peak");
    expect(ucapan("19.840 kWh/tahun")).toBe("19.840 kilowatt-jam per tahun");
    expect(ucapan("14,1 tCO₂e")).toBe("14,1 ton CO2 ekuivalen");
    expect(ucapan("1.454,3 Rp/kWh")).toBe("1.454,3 rupiah per kilowatt-jam");
    expect(ucapan("42%")).toBe("42 persen");
    expect(ucapan("112 m²")).toBe("112 meter persegi");
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
