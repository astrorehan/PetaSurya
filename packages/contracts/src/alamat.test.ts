import { describe, expect, it } from "vitest";
import { HasilAlamat, PencarianAlamat, PermintaanAlamat } from "./alamat.ts";
import rumah from "../../../data/fixtures/bangunan/rumah-kandang-limun.json";

describe("PermintaanAlamat", () => {
  it("memangkas spasi dan menolak kueri terlalu pendek atau panjang", () => {
    expect(PermintaanAlamat.parse({ q: "  Jl. Kapuas  " }).q).toBe("Jl. Kapuas");
    for (const q of ["", "  ab ", "x".repeat(201)]) expect(PermintaanAlamat.safeParse({ q }).success).toBe(false);
  });
});

describe("HasilAlamat", () => {
  const dasar = { nama: "Jalan Kapuas", alamat: "Jalan Kapuas, Kandang Limun, Kota Bengkulu", lat: -3.759, lon: 102.276, presisi: "road" };

  it("menerima alamat tanpa bangunan dan alamat dengan footprint yang memuat titik", () => {
    expect(HasilAlamat.parse({ ...dasar, bangunan: null, kecocokan: null, jarak_m: null }).bangunan).toBeNull();
    const memuat = HasilAlamat.parse({ ...dasar, presisi: "house", bangunan: rumah, kecocokan: "memuat", jarak_m: 0 });
    expect(memuat.bangunan?.id).toBe(rumah.id);
  });

  it("menolak kecocokan di luar memuat/terdekat dan jarak negatif", () => {
    expect(HasilAlamat.safeParse({ ...dasar, bangunan: rumah, kecocokan: "tebakan", jarak_m: 3 }).success).toBe(false);
    expect(HasilAlamat.safeParse({ ...dasar, bangunan: rumah, kecocokan: "terdekat", jarak_m: -1 }).success).toBe(false);
  });

  it("membungkus hasil dengan atribusi geocoder", () => {
    const data = PencarianAlamat.parse({ kueri: "kapuas", hasil: [], atribusi: "© OpenStreetMap contributors" });
    expect(data.hasil).toEqual([]);
  });
});
