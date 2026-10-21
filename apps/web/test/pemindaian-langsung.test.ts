import { describe, expect, it, afterEach, vi } from "vitest";
import { BangunanRingkas } from "@petasurya/contracts";
import demo from "../../../data/fixtures/demo.json";
import katalog from "../../../data/fixtures/katalog-bangunan.json";
import { areaSkenario, paketContoh, tampilanPaket, paketBangunan, potensiLuas, PROFIL_SIMULASI } from "../lib/pemindaian";

const BBOX = { barat: 102.26, selatan: -3.77, timur: 102.27, utara: -3.76 };

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
  it("membatalkan pengambilan area saat peta bergerak lagi", async () => {
    const { muatFootprintArea } = await import("../lib/api");
    let sinyal: AbortSignal | undefined;
    vi.stubGlobal("fetch", vi.fn((_url, opsi: RequestInit) => new Promise((_resolve, reject) => {
      sinyal = opsi.signal as AbortSignal;
      sinyal.addEventListener("abort", () => reject(sinyal!.reason), { once: true });
    })));
    const permintaan = new AbortController();
    const hasil = muatFootprintArea(BBOX, permintaan.signal);
    const ditolak = expect(hasil).rejects.toMatchObject({ name: "AbortError" });
    permintaan.abort();
    await ditolak;
    expect(sinyal?.aborted).toBe(true);
  });

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
    const { pindaiBangunan, muatFootprintArea } = await import("../lib/api");
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify(paketContoh(demo[0].bangunan.id)))));
    await expect(pindaiBangunan(999)).rejects.toThrow();
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({error:{code:"OUT_OF_COVERAGE",message:"Analisis tersedia di Kota Bengkulu",retriable:false}}),{status:422})));
    await expect(muatFootprintArea(BBOX)).rejects.toThrow("Analisis tersedia di Kota Bengkulu");
  });
});

describe("footprint area peta", () => {
  const area = {
    permintaan: { ...BBOX, batas: 1500 },
    jumlah: 2,
    terpotong: false,
    bangunan: [{ ...katalog.bangunan[0], building_tag: "yes", nama: null, perkiraan_jenis: "rumah" }],
    perkiraan_rumah: { min_m2: 56.3, max_m2: 372.3, dasar: "Persentil luas building=house" },
    sumber: { penerbit: "OpenStreetMap contributors", url: "https://overpass-api.de/api/interpreter", diambil: "2026-10-14", timestamp_osm: "2026-10-14T16:04:41Z", catatan: "Snapshot" },
  };

  it("mengirim bbox dan batas jumlah sebagai parameter kueri", async () => {
    const { muatFootprintArea } = await import("../lib/api");
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify(area)));
    vi.stubGlobal("fetch", fetchMock);
    const hasil = await muatFootprintArea(BBOX);
    const url = new URL(fetchMock.mock.calls[0][0]);
    expect(url.pathname).toBe("/api/v1/footprints");
    expect(Object.fromEntries(url.searchParams)).toEqual({ barat: "102.26", selatan: "-3.77", timur: "102.27", utara: "-3.76", batas: "1500" });
    expect(hasil.bangunan[0].perkiraan_jenis).toBe("rumah");
  });

  it("menolak bbox di luar WGS84 sebelum memanggil engine dan respons yang tidak sah", async () => {
    const { GalatPemindaian, muatFootprintArea } = await import("../lib/api");
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ ...area, jumlah: -1 })));
    vi.stubGlobal("fetch", fetchMock);
    await expect(muatFootprintArea({ ...BBOX, barat: -200 })).rejects.toThrow();
    expect(fetchMock).not.toHaveBeenCalled();
    await expect(muatFootprintArea(BBOX)).rejects.toBeInstanceOf(GalatPemindaian);
  });
});

describe("pencarian alamat", () => {
  const hasilAlamat = {
    kueri: "Jl. Kapuas",
    hasil: [{ nama: "Masjid Jamik", alamat: "Masjid Jamik, Jalan Sudirman, Kota Bengkulu", lat: -3.7929, lon: 102.2655, presisi: "amenity", bangunan: { ...katalog.bangunan[0] }, kecocokan: "memuat", jarak_m: 0 }],
    atribusi: "Alamat © kontributor OpenStreetMap (ODbL)",
  };

  it("mengirim kueri yang dipangkas dan membaca bangunan di titik alamat", async () => {
    const { cariAlamat } = await import("../lib/api");
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify(hasilAlamat)));
    vi.stubGlobal("fetch", fetchMock);
    const data = await cariAlamat("  Jl. Kapuas ");
    const url = new URL(fetchMock.mock.calls[0][0]);
    expect(url.pathname).toBe("/api/v1/alamat");
    expect(url.searchParams.get("q")).toBe("Jl. Kapuas");
    expect(data.hasil[0].kecocokan).toBe("memuat");
  });

  it("tidak memanggil geocoder untuk kueri pendek dan menolak respons tidak sah", async () => {
    const { GalatPemindaian, cariAlamat } = await import("../lib/api");
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ kueri: "x", hasil: "bukan daftar", atribusi: "" })));
    vi.stubGlobal("fetch", fetchMock);
    await expect(cariAlamat("ab")).rejects.toThrow();
    expect(fetchMock).not.toHaveBeenCalled();
    await expect(cariAlamat("jalan kapuas")).rejects.toBeInstanceOf(GalatPemindaian);
  });
});
