import { describe, expect, it } from "vitest";
import { PaketPemindaian } from "./pemindaian.ts";
import demo from "../../../data/fixtures/demo.json";

describe("Paket pemindaian", () => {
  const data = {
    bangunan: demo[0].bangunan, analisis: null, tersimpan: false, durasi_detik: 0,
    bingkai: { x0: 0, y0: 0, lebar: 640, tinggi: 480, zoom: 19, meter_per_piksel: .298, tiles: demo[0].viewer.tiles },
  };
  it("membedakan bangunan yang belum dianalisis dan hasil tersimpan", () => {
    expect(PaketPemindaian.parse(data).analisis).toBeNull();
    expect(PaketPemindaian.parse({ ...data, analisis: demo[0].analisis, tersimpan: true }).analisis?.building_id).toBe(data.bangunan.id);
  });
  it("menolak bingkai atau waktu analisis yang tidak sah", () => {
    expect(PaketPemindaian.safeParse({ ...data, durasi_detik: -1 }).success).toBe(false);
    expect(PaketPemindaian.safeParse({ ...data, bingkai: { ...data.bingkai, lebar: 0 } }).success).toBe(false);
  });
});
