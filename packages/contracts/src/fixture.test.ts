import { readdirSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { describe, expect, it } from "vitest";
import type { ZodType } from "zod";
import { AnalisisAtap } from "./analisis.ts";
import { BangunanRingkas } from "./bangunan.ts";
import { GalatApi } from "./galat.ts";
import { HasilSimulasi, ParameterFisika } from "./simulasi.ts";

// Setiap fixture di data/fixtures harus lolos kontrak zod. Padanannya di sisi
// Python: services/engine/tests/test_contracts.py atas berkas yang sama.
const dirFixture = resolve(import.meta.dirname, "..", "..", "..", "data", "fixtures");

function bacaSemua(sub: string): Array<[string, unknown]> {
  const dir = join(dirFixture, sub);
  return readdirSync(dir)
    .filter((n) => n.endsWith(".json"))
    .sort()
    .map((n) => [n, JSON.parse(readFileSync(join(dir, n), "utf-8"))]);
}

function ujiFolder(sub: string, skema: ZodType, minimal: number) {
  describe(`fixtures/${sub}`, () => {
    const berkas = bacaSemua(sub);
    it(`ada minimal ${minimal} berkas`, () => {
      expect(berkas.length).toBeGreaterThanOrEqual(minimal);
    });
    for (const [nama, isi] of berkas) {
      it(`${nama} lolos kontrak`, () => {
        const hasil = skema.safeParse(isi);
        expect(hasil.error?.issues ?? []).toEqual([]);
      });
    }
  });
}

ujiFolder("bangunan", BangunanRingkas, 3);
ujiFolder("analisis", AnalisisAtap, 2);
ujiFolder("simulasi", HasilSimulasi, 1);
ujiFolder("parameter", ParameterFisika, 1);

describe("ParameterFisika", () => {
  const contoh = bacaSemua("parameter")[0][1] as Record<string, unknown>;
  it("mewajibkan spesifikasi modul, albedo, dan seluruh faktor derate", () => {
    for (const kunci of ["modul", "albedo", "derate"]) {
      expect(ParameterFisika.safeParse({ ...contoh, [kunci]: undefined }).success).toBe(false);
    }
    const modul = (contoh.modul as Record<string, unknown>);
    expect(ParameterFisika.safeParse({ ...contoh, modul: { ...modul, t_noct: undefined } }).success).toBe(false);
  });
  it("menolak nilai non-finite dan fraksi di luar rentang", () => {
    for (const albedo of [NaN, Infinity, -1, 1.1]) {
      expect(ParameterFisika.safeParse({ ...contoh, albedo }).success).toBe(false);
    }
  });
  it("menyimpan parameter fisika pada hasil baru tanpa menolak fixture lama", () => {
    const hasil = bacaSemua("simulasi")[0][1] as Record<string, unknown>;
    expect(HasilSimulasi.parse({ ...hasil, parameter_fisika: contoh }).parameter_fisika).toEqual(ParameterFisika.parse(contoh));
  });
});

describe("fixtures/bangunan — sumber tercatat", () => {
  for (const [nama, isi] of bacaSemua("bangunan")) {
    const b = isi as { _sumber?: Record<string, unknown>; source_ref: string; geom: { coordinates: number[][][] } };
    it(`${nama} punya URL kueri + tanggal ambil, cincin tertutup`, () => {
      expect(b._sumber?.url_kueri).toMatch(/^https:\/\//);
      expect(b._sumber?.diambil).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(b.source_ref).toMatch(/^way\/\d+$/);
      const cincin = b.geom.coordinates[0];
      expect(cincin[0]).toEqual(cincin[cincin.length - 1]);
    });
  }
});

describe("fixtures/analisis — dua jalur", () => {
  const metode = bacaSemua("analisis").map(([, isi]) => AnalisisAtap.parse(isi));
  it("ada varian cv dengan mask dan varian fallback dengan peringatan", () => {
    const cv = metode.find((a) => a.method === "cv");
    const fb = metode.find((a) => a.method === "footprint_fallback");
    expect(cv?.mask_geojson?.type).toBe("MultiPolygon");
    expect(fb?.mask_geojson).toBeNull();
    expect(fb?.peringatan).toBeTruthy();
    expect(fb?.confidence).toBeLessThan(0.45);
  });
});

describe("fixtures/simulasi — berlabel contoh", () => {
  for (const [nama, isi] of bacaSemua("simulasi")) {
    it(`${nama} menyatakan dirinya contoh`, () => {
      expect((isi as { _catatan?: string })._catatan).toMatch(/^contoh simulasi dihitung/);
    });
  }
});

describe("GalatApi", () => {
  it("menerima amplop galat cetak biru §04", () => {
    expect(
      GalatApi.safeParse({
        error: {
          code: "IRRADIANCE_UNAVAILABLE",
          message: "Data iradiansi NASA POWER tidak tersedia untuk koordinat ini.",
          hint: "Coba titik yang sedikit bergeser, atau gunakan sel kisi terdekat.",
          retriable: true,
        },
      }).success,
    ).toBe(true);
  });
  it("menolak kode di luar daftar", () => {
    expect(GalatApi.safeParse({ error: { code: "APA_INI", message: "x", retriable: false } }).success).toBe(false);
  });
});

describe("HasilSimulasi — batas", () => {
  it("menolak monthly_kwh yang bukan 12 nilai", () => {
    const contoh = bacaSemua("simulasi")[0][1] as Record<string, unknown>;
    expect(HasilSimulasi.safeParse({ ...contoh, monthly_kwh: [1, 2, 3] }).success).toBe(false);
  });
  it("payback_years dan irr boleh null", () => {
    const contoh = bacaSemua("simulasi")[0][1] as Record<string, unknown>;
    expect(HasilSimulasi.safeParse({ ...contoh, payback_years: null, irr: null }).success).toBe(true);
  });
});
