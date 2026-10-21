import { describe, expect, it } from "vitest";
import tokoJson from "../../../data/fixtures/bangunan/toko-wr-supratman.json";
import limunJson from "../../../data/fixtures/bangunan/rumah-kandang-limun.json";
import { luasBertanda, panjangSisi, proyeksi, titikBerat, type Titik } from "../app/(produk)/desain/_geo";

const cincin = (b: { geom: { coordinates: number[][][] } }) => b.geom.coordinates[0] as Titik[];

describe("plot survei: proyeksi ekuirektangular lokal", () => {
  it("luas jejak sama dengan footprint_m2 fixture (0,1 m²)", () => {
    for (const b of [tokoJson, limunJson]) {
      expect(Math.abs(luasBertanda(proyeksi(cincin(b))))).toBeCloseTo(b.footprint_m2, 1);
    }
  });

  it("panjang sisi toko sesuai hitungan tangan", () => {
    const sisi = panjangSisi(proyeksi(cincin(tokoJson))).map((m) => Number(m.toFixed(1)));
    expect(sisi).toEqual([25.3, 9.0, 28.4, 5.6, 3.1, 3.4]);
  });

  it("titik berat persegi satuan di tengahnya", () => {
    const persegi: Titik[] = [
      [0, 0],
      [2, 0],
      [2, 2],
      [0, 2],
    ];
    expect(titikBerat(persegi)).toEqual([1, 1]);
  });
});
