import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { kontras, tokenTema } from "./kontras";

/*
 * Kontras diuji atas TOKEN, bukan tangkapan layar. Setiap tinta × setiap
 * permukaan di kedua tema harus ≥ 4,5:1 (WCAG AA teks normal).
 * Pengecualian: --ink-3 hanya untuk metadata (versi mesin, tanggal citra),
 * bukan informasi yang harus dibaca, sehingga ambang 3,0:1 (AA teks besar/UI).
 * Warna semantik (--pri, --surya, --daun, --merah) hanya untuk angka besar
 * (≥ 24 px, "teks besar" WCAG), ikon, isian grafik, dan garis: ambang 3,0:1
 * di atas --surface dan di atas latar pasangannya (--*-bg). Teks kecil
 * berwarna semantik dilarang; teks kecil selalu --ink / --ink-2.
 */
const css = readFileSync(join(import.meta.dirname, "tokens.css"), "utf8");

const TINTA = ["--ink", "--ink-2", "--ink-3"] as const;
const PERMUKAAN = ["--paper", "--surface", "--surface-2", "--surface-3"] as const;
const SEMANTIK = ["--pri", "--surya", "--daun", "--merah"] as const;
const AMBANG: Record<string, number> = { "--ink": 4.5, "--ink-2": 4.5, "--ink-3": 3.0 };

for (const tema of ["terang", "gelap"] as const) {
  const t = tokenTema(css, tema);

  describe(`tema ${tema}`, () => {
    it("semua token yang diuji ada", () => {
      for (const k of [...TINTA, ...PERMUKAAN, ...SEMANTIK]) expect(t[k], k).toBeDefined();
    });

    for (const tinta of TINTA) {
      for (const p of PERMUKAAN) {
        it(`${tinta} × ${p} ≥ ${AMBANG[tinta]}`, () => {
          expect(kontras(t[tinta], t[p])).toBeGreaterThanOrEqual(AMBANG[tinta]);
        });
      }
    }

    for (const s of SEMANTIK) {
      it(`${s} × --surface ≥ 3,0`, () => {
        expect(kontras(t[s], t["--surface"])).toBeGreaterThanOrEqual(3.0);
      });
      it(`${s} × ${s}-bg ≥ 3,0`, () => {
        expect(kontras(t[s], t[`${s}-bg`])).toBeGreaterThanOrEqual(3.0);
      });
    }
  });
}
