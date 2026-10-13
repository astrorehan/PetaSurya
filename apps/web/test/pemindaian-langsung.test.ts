import { describe, expect, it, afterEach, vi } from "vitest";
import { BangunanRingkas } from "@petasurya/contracts";
import demo from "../../../data/fixtures/demo.json";
import katalog from "../../../data/fixtures/katalog-bangunan.json";
import { areaSkenario, paketContoh, tampilanPaket, paketBangunan, potensiLuas, PROFIL_SIMULASI } from "../lib/pemindaian";

afterEach(() => { vi.unstubAllGlobals(); });

describe("bangunan dan bingkai pemindaian", () => {
  it("menawarkan lebih dari sembilan bangunan tanpa mengarang analisis", () => {
    expect(katalog.bangunan.length).toBeGreaterThan(100);
    const baru = katalog.bangunan.find(b => !demo.some(d => d.bangunan.id === b.id))!;
    const p = paketBangunan(BangunanRingkas.parse(baru));
    expect(p.analisis).toBeNull();
    expect(p.tersimpan).toBe(false);
    expect(tampilanPaket(p).mask_rings).toEqual([]);
  });
  it("mengembalikan kontur ke piksel sama dengan georeferensi Python", () => {
    for (const d of demo) {
      const p = paketContoh(d.bangunan.id)!;
      const t = tampilanPaket(p);
      t.footprint.forEach((point, i) => point.forEach((v, k) => expect(v).toBeCloseTo(d.viewer.footprint[i][k], 4)));
      t.mask_rings.forEach((poly, i) => poly.forEach((ring, j) => ring.forEach((point, k) => point.forEach((v, l) => expect(v).toBeCloseTo(d.viewer.mask_rings[i][j][k][l], 4)))));
    }
  });
  it("membentuk bingkai bangunan baru pada centroid yang sama dengan Python", () => {
    for (const d of demo) {
      const p = paketBangunan(BangunanRingkas.parse({ ...d.bangunan, id: 100001 }));
      expect(p.bingkai.x0).toBeCloseTo(d.viewer.bingkai.x0, 5);
      expect(p.bingkai.y0).toBeCloseTo(d.viewer.bingkai.y0, 5);
    }
  });
});

describe("permintaan pemindaian", () => {
  it("kapasitas rumah tidak otomatis memakai seluruh potensi atap besar", () => {
    const p=paketContoh(1146141501)!;
    expect(potensiLuas(p)).toBeGreaterThan(200);
    const area=areaSkenario(2.2,"rumah");
    const modul=PROFIL_SIMULASI.rumah.data.parameter_fisika.modul;
    expect(area).toBeCloseTo(4*modul.panjang_m*modul.lebar_m,8);
    expect(area).toBeLessThan(p.analisis!.usable_area_m2);
  });
  it("hitung ulang membawa area skenario sehingga kapasitas tidak kembali ke seluruh atap", async () => {
    const { hitungUlangAtap }=await import("../lib/api");
    const fetchMock=vi.fn().mockResolvedValue(new Response(JSON.stringify(demo[0].simulasi)));
    vi.stubGlobal("fetch",fetchMock);
    const acuan=PROFIL_SIMULASI.rumah.data;
    await hitungUlangAtap({roof_analysis_id:9914,asumsi:acuan.asumsi,parameter_fisika:acuan.parameter_fisika,usable_area_m2:areaSkenario(2.2,"rumah")});
    expect(JSON.parse(fetchMock.mock.calls[0][1].body).usable_area_m2).toBeCloseTo(areaSkenario(2.2,"rumah"));
  });
  it("memanggil model untuk bangunan baru dan memvalidasi respons", async () => {
    const { pindaiBangunan } = await import("../lib/api");
    const p = paketContoh(demo[0].bangunan.id)!;
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify(p)));
    vi.stubGlobal("fetch", fetchMock);
    expect((await pindaiBangunan(p.bangunan.id, true)).analisis?.building_id).toBe(p.bangunan.id);
    expect(fetchMock.mock.calls[0][0]).toMatch(/\/api\/v1\/scans$/);
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({ building_id: p.bangunan.id, force: true });
  });
  it("menolak hasil bangunan lain dan mempertahankan pesan gagal sumber", async () => {
    const { pindaiBangunan, bangunanDiArea } = await import("../lib/api");
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify(paketContoh(demo[0].bangunan.id)))));
    await expect(pindaiBangunan(999)).rejects.toThrow();
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({error:{code:"GEODATA_UNAVAILABLE",message:"Data OSM belum tersedia",retriable:true}}),{status:503})));
    await expect(bangunanDiArea(-3.76,102.26)).rejects.toThrow("Data OSM belum tersedia");
  });
});
