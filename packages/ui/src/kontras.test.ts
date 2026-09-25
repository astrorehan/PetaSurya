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
      // Latar berwarna (lencana, kartu keyakinan rendah) tetap memuat teks --ink/--ink-2.
      for (const tinta of ["--ink", "--ink-2"] as const) {
        it(`${tinta} × ${s}-bg ≥ 4,5`, () => {
          expect(kontras(t[tinta], t[`${s}-bg`])).toBeGreaterThanOrEqual(4.5);
        });
      }
    }

    // Label tombol primer di atas isian --pri, termasuk saat hover dan ditekan.
    for (const isi of ["--pri", "--pri-hover", "--pri-tekan"] as const) {
      it(`--on-pri × ${isi} ≥ 4,5`, () => {
        expect(t[isi], isi).toBeDefined();
        expect(kontras(t["--on-pri"], t[isi])).toBeGreaterThanOrEqual(4.5);
      });
    }
  });
}

describe("susunan tokens.css", () => {
  it("blok prefers-color-scheme identik dengan blok [data-theme=dark]", () => {
    const media = css.slice(css.indexOf("@media (prefers-color-scheme: dark)"));
    const isiMedia = media.slice(media.indexOf("{", media.indexOf(":root:not")) + 1, media.indexOf("}"));
    const gelap = tokenTema(css, "gelap");
    const warnaMedia: Record<string, string> = {};
    for (const m of isiMedia.matchAll(/(--[a-z0-9-]+):\s*(#[0-9a-f]{3,6})\s*;/gi)) warnaMedia[m[1]] = m[2];
    expect(warnaMedia).toEqual(gelap);
  });

  it("tema terang dan gelap mendefinisikan token warna yang sama", () => {
    expect(Object.keys(tokenTema(css, "gelap")).sort()).toEqual(
      Object.keys(tokenTema(css, "terang")).filter((k) => !k.startsWith("--brand")).sort(),
    );
  });
});
