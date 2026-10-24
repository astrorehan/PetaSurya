import { describe, expect, it } from "vitest";
import type { BangunanRingkas } from "@petasurya/contracts";
import { bangunanDiTitik, perluMuatArea, type CakupanArea, type Kotak } from "../lib/area";
import { BATAS_INDONESIA, kotakDalam, pusatKotak } from "../lib/cakupan";
import { KATALOG_BANGUNAN } from "../lib/pemindaian";

const dasar = KATALOG_BANGUNAN[0];
function persegi(id: number, x: number, y: number, sisi = 0.0002): BangunanRingkas {
  return { ...dasar, id, geom: { type: "Polygon", coordinates: [[[x, y], [x + sisi, y], [x + sisi, y + sisi], [x, y + sisi], [x, y]]] } };
}

describe("cakupan nasional", () => {
  it("batas geser peta mencakup Sabang sampai Merauke dan tidak mencakup Bengkulu saja", () => {
    const [barat, selatan, timur, utara] = BATAS_INDONESIA;
    // Sabang, Merauke, Miangas, Pulau Rote
    for (const [lon, lat] of [[95.32, 5.89], [140.4, -8.5], [126.6, 5.56], [123.1, -10.9]]) {
      expect(lon >= barat && lon <= timur && lat >= selatan && lat <= utara).toBe(true);
    }
    expect(kotakDalam([102.2, -3.8, 102.3, -3.7], BATAS_INDONESIA)).toBe(true);
    expect(kotakDalam([100, 1, 110, 12], BATAS_INDONESIA)).toBe(false);
    expect(pusatKotak([100, -2, 102, 0])).toEqual([101, -1]);
  });
});

describe("jendela footprint langsung", () => {
  // Jendela ±300 m di sekitar Monas.
  const jendela: Kotak = [106.8228, -6.1775, 106.8282, -6.1721];
  const langsung: CakupanArea = { langsung: true, dimuat: jendela };

  it("selalu meminta area pertama dan area setelah snapshot Kota Bengkulu", () => {
    expect(perluMuatArea([106.8, -6.2, 106.85, -6.15], null)).toBe(true);
    expect(perluMuatArea([102.26, -3.77, 102.27, -3.76], { langsung: false, dimuat: null })).toBe(true);
    expect(perluMuatArea([102.26, -3.77, 102.27, -3.76], { langsung: false, dimuat: [102.26, -3.77, 102.27, -3.76] })).toBe(true);
  });

  it("tidak memuat ulang saat tampilan masuk jendela atau pusatnya bergeser sedikit", () => {
    expect(perluMuatArea([106.824, -6.1765, 106.827, -6.1731], langsung)).toBe(false);
    // Tampilan jauh lebih lebar, pusat tetap di jendela.
    expect(perluMuatArea([106.81, -6.19, 106.84, -6.16], langsung)).toBe(false);
    // Pusat bergeser 20% lebar jendela.
    expect(perluMuatArea([106.8239, -6.1775, 106.8293, -6.1721], langsung)).toBe(false);
  });

  it("memuat ulang saat pusat peta meninggalkan bagian tengah jendela", () => {
    expect(perluMuatArea([106.83, -6.1775, 106.84, -6.1721], langsung)).toBe(true);
    expect(perluMuatArea([106.8228, -6.19, 106.8282, -6.185], langsung)).toBe(true);
  });
});

describe("bangunan di titik alamat", () => {
  it("memilih footprint yang memuat titik dan mengabaikan yang hanya sebidang kotak", () => {
    const miring: BangunanRingkas = { ...dasar, id: 2, geom: { type: "Polygon", coordinates: [[[0, 0], [0.001, 0], [0, 0.001], [0, 0]]] } };
    const kotak = persegi(1, 106.8, -6.2);
    expect(bangunanDiTitik([miring, kotak], 106.8001, -6.1999)?.id).toBe(1);
    // Sudut kotak pembatas segitiga berada di luar bentuknya.
    expect(bangunanDiTitik([miring], 0.0009, 0.0009)).toBeNull();
    expect(bangunanDiTitik([miring], 0.0002, 0.0002)?.id).toBe(2);
    expect(bangunanDiTitik([kotak], 106.9, -6.2)).toBeNull();
  });
});
