import { describe, expect, it } from "vitest";
import { formatKoordinat, uraiKoordinat } from "../lib/koordinat";

describe("uraiKoordinat", () => {
  it("menerima pasangan yang disalin dari Google Maps", () => {
    expect(uraiKoordinat("-7.793354, 110.366671")).toEqual({ lat: -7.793354, lon: 110.366671 });
    expect(uraiKoordinat("  -3.882545,102.332856 ")).toEqual({ lat: -3.882545, lon: 102.332856 });
    expect(uraiKoordinat("-6.9147 107.6098")).toEqual({ lat: -6.9147, lon: 107.6098 });
  });

  it("menerima desimal koma gaya id-ID", () => {
    expect(uraiKoordinat("-7,793354, 110,366671")).toEqual({ lat: -7.793354, lon: 110.366671 });
    expect(uraiKoordinat("-7,793354; 110,366671")).toEqual({ lat: -7.793354, lon: 110.366671 });
  });

  it("mengambil titik tempat dari tautan Google Maps lebih dulu", () => {
    const tautan = "https://www.google.com/maps/place/Malioboro+Mall/@-7.7930001,110.3650001,17z/data=!3m1!4b1!4m6!3m5!1s0x0:0x0!8m2!3d-7.7932923!4d110.3667089";
    expect(uraiKoordinat(tautan)).toEqual({ lat: -7.7932923, lon: 110.3667089 });
  });

  it("memakai parameter q atau pusat kamera bila tidak ada titik tempat", () => {
    expect(uraiKoordinat("https://maps.google.com/?q=-3.882545,102.332856")).toEqual({ lat: -3.882545, lon: 102.332856 });
    expect(uraiKoordinat("https://www.google.com/maps/search/?api=1&query=-6.175392%2C106.827153")).toEqual({ lat: -6.175392, lon: 106.827153 });
    expect(uraiKoordinat("https://www.google.com/maps/@-6.9147,107.6098,19z")).toEqual({ lat: -6.9147, lon: 107.6098 });
  });

  it("tidak menganggap teks biasa sebagai koordinat", () => {
    for (const teks of ["Malioboro Mall", "Jl. Merdeka 12", "12 34", "553247482", "RT 20 RW 3", "https://maps.app.goo.gl/AbCdEf", ""]) {
      expect(uraiKoordinat(teks)).toBeNull();
    }
  });

  it("menolak nilai di luar rentang", () => {
    expect(uraiKoordinat("-97.5, 110.3")).toBeNull();
    expect(uraiKoordinat("7.5, 210.3")).toBeNull();
  });
});

describe("formatKoordinat", () => {
  it("menulis enam desimal dengan koma id-ID", () => {
    expect(formatKoordinat({ lat: -7.793354, lon: 110.366671 })).toBe("-7,793354; 110,366671");
  });
});
