import { describe, expect, it } from "vitest";
import { AKURASI_RUMAH_M, bacaLokasi, nilaiLokasi, pesanGalatLokasi } from "../lib/lokasi";

describe("nilaiLokasi", () => {
  it("menandai lokasi tepat bila akurasi cukup untuk satu rumah", () => {
    expect(nilaiLokasi(-3.8825, 102.3328, 12)).toEqual({ jenis: "siap", lokasi: { lat: -3.8825, lon: 102.3328, akurasi_m: 12 }, tepat: true });
    expect(nilaiLokasi(-3.8825, 102.3328, AKURASI_RUMAH_M + 1)).toMatchObject({ jenis: "siap", tepat: false });
  });

  it("menolak lokasi di luar Indonesia", () => {
    expect(nilaiLokasi(1.3521, 103.0, 10)).toMatchObject({ jenis: "siap" });
    expect(nilaiLokasi(35.68, 139.76, 10)).toMatchObject({ jenis: "galat" });
    expect(nilaiLokasi(Number.NaN, 102.3, 10)).toMatchObject({ jenis: "galat" });
  });

  it("menganggap akurasi tidak terbaca sebagai tidak tepat", () => {
    expect(nilaiLokasi(-3.88, 102.33, Number.NaN)).toMatchObject({ jenis: "siap", tepat: false });
  });
});

describe("bacaLokasi", () => {
  it("memetakan galat izin dan ketiadaan geolokasi", async () => {
    const tolak = { getCurrentPosition: (_ok: unknown, gagal: (e: { code: number }) => void) => gagal({ code: 1 }) } as unknown as Geolocation;
    expect(await bacaLokasi(tolak)).toEqual({ jenis: "galat", pesan: pesanGalatLokasi(1) });
    expect(await bacaLokasi(undefined)).toEqual({ jenis: "galat", pesan: pesanGalatLokasi(2) });
  });

  it("meneruskan posisi perangkat", async () => {
    const geo = { getCurrentPosition: (ok: (p: unknown) => void) => ok({ coords: { latitude: -6.9025, longitude: 107.6188, accuracy: 8 } }) } as unknown as Geolocation;
    expect(await bacaLokasi(geo)).toMatchObject({ jenis: "siap", tepat: true, lokasi: { lat: -6.9025, lon: 107.6188 } });
  });
});
