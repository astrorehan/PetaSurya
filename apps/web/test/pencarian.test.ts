import { describe, expect, it } from "vitest";
import { bacaPilihanKatalog, cariBangunan, tautanKatalog, urutkanBangunan } from "../lib/pencarian";
import { KATALOG_BANGUNAN } from "../lib/pemindaian";

const katalog = KATALOG_BANGUNAN;
const ids = (kueri: string) => cariBangunan(katalog, kueri).map((b) => b.id);

describe("pencarian bangunan", () => {
  it("menampilkan katalog lengkap untuk masukan kosong tanpa mengubah urutannya", () => {
    expect(cariBangunan(katalog, "  ")).toEqual(katalog);
    expect(cariBangunan(katalog, "")).not.toBe(katalog);
  });

  it.each([
    ["rumah", 1145010599],
    ["toko", 991016391],
    ["kampus", 1146141501],
    ["pendidikan hukum", 1146141501],
    ["FAKULTAS   HUKUM", 1146141501],
    ["991016391", 991016391],
  ])("menemukan %s pada katalog nyata", (kueri, id) => {
    expect(ids(kueri)).toContain(id);
  });

  it("mencocokkan semua kata agar hasil tidak melebar ke bangunan lain", () => {
    expect(ids("kampus hukum")).toContain(1146141501);
    expect(ids("kampus hukum")).not.toContain(1145010599);
    expect(ids("kampus tidakadabangunanini")).toEqual([]);
  });

  it("menerima nama dengan tanda diakritik", () => {
    const bangunan = { ...katalog[0], nama: "Kafé Surya" };
    expect(cariBangunan([bangunan], "kafe surya")).toEqual([bangunan]);
  });

  it("tidak menganggap bangunan tanpa jenis sebagai rumah atau toko", () => {
    const bangunan = { ...katalog[0], nama: null, building_tag: "yes" };
    expect(cariBangunan([bangunan], "rumah")).toEqual([]);
    expect(cariBangunan([bangunan], "toko")).toEqual([]);
  });
});

describe("urutan katalog", () => {
  const kecil = { ...katalog[0], id: 2, nama: "Gedung 2", footprint_m2: 80 };
  const besar = { ...katalog[0], id: 10, nama: "Gedung 10", footprint_m2: 900 };
  const tanpaNama = { ...katalog[0], id: 3, nama: null, footprint_m2: 300 };
  const bangunan = [besar, tanpaNama, kecil];

  it("mendahulukan nama yang dikenal dan mengurutkan angka secara alami", () => {
    expect(urutkanBangunan(bangunan, "nama")).toEqual([kecil, besar, tanpaNama]);
    expect(bangunan).toEqual([besar, tanpaNama, kecil]);
  });

  it("mengurutkan luas jejak bangunan dalam dua arah tanpa mengubah masukan", () => {
    expect(urutkanBangunan(bangunan, "luas-terbesar")).toEqual([besar, tanpaNama, kecil]);
    expect(urutkanBangunan(bangunan, "luas-terkecil")).toEqual([kecil, tanpaNama, besar]);
    expect(bangunan).toEqual([besar, tanpaNama, kecil]);
  });

  it("mengurai luas yang sama memakai nama lalu ID agar hasil tetap konsisten", () => {
    const kembar = { ...kecil, id: 4 };
    expect(urutkanBangunan([kembar, kecil], "luas-terbesar")).toEqual([kecil, kembar]);
  });
});

describe("tautan pencarian katalog", () => {
  it("memulihkan kueri, filter, dan urutan dari URL yang dibagikan", () => {
    const pilihan = { query: "kampus hukum", filter: "tersimpan", urutan: "luas-terbesar" } as const;
    const url = new URL(tautanKatalog(pilihan), "https://example.com");
    expect(bacaPilihanKatalog(Object.fromEntries(url.searchParams))).toEqual(pilihan);
  });

  it("menyingkat nilai awal dan memangkas spasi tanpa kehilangan tanda baca", () => {
    expect(tautanKatalog({ query: "  ", filter: "semua", urutan: "nama" })).toBe("/peta");
    const url = new URL(tautanKatalog({ query: "  Kafé & toko + 2  ", filter: "semua", urutan: "nama" }), "https://example.com");
    expect(url.searchParams.get("q")).toBe("Kafé & toko + 2");
    expect([...url.searchParams.keys()]).toEqual(["q"]);
  });

  it("memakai nilai awal untuk parameter tidak dikenal dan nilai pertama untuk parameter berulang", () => {
    expect(bacaPilihanKatalog({ q: ["rumah", "toko"], filter: "asing", urut: "asing" })).toEqual({ query: "rumah", filter: "semua", urutan: "nama" });
    expect(bacaPilihanKatalog({ filter: ["tersimpan", "semua"], urut: ["luas-terkecil", "nama"] })).toEqual({ query: "", filter: "tersimpan", urutan: "luas-terkecil" });
    expect(bacaPilihanKatalog({})).toEqual({ query: "", filter: "semua", urutan: "nama" });
  });
});
