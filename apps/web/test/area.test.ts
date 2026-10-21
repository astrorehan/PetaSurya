import { describe, expect, it } from "vitest";
import type { BangunanRingkas } from "@petasurya/contracts";
import { gabungBangunan, kotakBangunan, memotongArea, simpanArea, type Kotak } from "../lib/area";
import { KATALOG_BANGUNAN } from "../lib/pemindaian";

const dasar = KATALOG_BANGUNAN[0];
function persegi(id: number, x: number, y: number, sisi = 0.0001): BangunanRingkas {
  return {
    ...dasar,
    id,
    geom: { type: "Polygon", coordinates: [[[x, y], [x + sisi, y], [x + sisi, y + sisi], [x, y + sisi], [x, y]]] },
  };
}

describe("area peta", () => {
  const area: Kotak = [102.26, -3.77, 102.27, -3.76];

  it("menghitung kotak pembatas dari cincin luar", () => {
    expect(kotakBangunan(persegi(1, 102.265, -3.765))).toEqual([102.265, -3.765, 102.2651, -3.7649]);
  });

  it("memasukkan bangunan yang hanya sebagian berada di area, seperti engine", () => {
    expect(memotongArea(persegi(1, 102.265, -3.765), area)).toBe(true);
    expect(memotongArea(persegi(2, 102.26995, -3.765), area)).toBe(true);
    expect(memotongArea(persegi(3, 102.2701, -3.765), area)).toBe(false);
    expect(memotongArea(persegi(4, 102.265, -3.7599), area)).toBe(false);
  });

  it("menggabung tanpa ID ganda dan mendahulukan sumber pertama", () => {
    const katalog = { ...persegi(7, 102.265, -3.765), nama: "Gedung katalog" };
    const snapshot = { ...persegi(7, 102.265, -3.765), nama: null, perkiraan_jenis: "rumah" as const };
    const hasil = gabungBangunan([katalog], [snapshot, persegi(8, 102.266, -3.765)]);
    expect(hasil.map((b) => b.id)).toEqual([7, 8]);
    expect(hasil[0].nama).toBe("Gedung katalog");
  });

  it("menahan area terbaru dan melepas yang paling lama saat melewati batas", () => {
    const lama = [persegi(1, 102.261, -3.765), persegi(2, 102.262, -3.765)];
    const baru = [persegi(3, 102.263, -3.765), persegi(1, 102.261, -3.765)];
    expect(simpanArea(lama, baru, 3).map((b) => b.id)).toEqual([3, 1, 2]);
    expect(simpanArea(lama, baru, 2).map((b) => b.id)).toEqual([3, 1]);
  });
});
