import { readdirSync, readFileSync } from "node:fs";
import { extname, join, relative } from "node:path";
import { describe, expect, it } from "vitest";
import { KATA_TERLARANG } from "../../../packages/ui/src/bahasa";

/*
 * Kata terlarang dicari di seluruh sumber antarmuka, termasuk komentar:
 * yang tertulis di kode cepat atau lambat muncul di layar.
 */
const AKAR = join(import.meta.dirname, "..");
const JENIS = new Set([".ts", ".tsx", ".css"]);

function kumpulkan(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const jalur = join(dir, e.name);
    if (e.isDirectory()) return kumpulkan(jalur);
    return JENIS.has(extname(e.name)) ? [jalur] : [];
  });
}

const berkas = ["app", "components", "lib"].flatMap((d) => kumpulkan(join(AKAR, d)));
const isi = berkas.map((b) => ({ nama: relative(AKAR, b), teks: readFileSync(b, "utf8") }));

describe("bahasa antarmuka", () => {
  it("memeriksa sumber yang ada", () => {
    expect(berkas.length).toBeGreaterThan(10);
  });

  for (const kata of KATA_TERLARANG) {
    it(`tidak memakai "${kata}"`, () => {
      // \b: "resolusi" tidak terhitung sebagai "solusi".
      const pola = new RegExp(`\\b${kata.replace(/[-\s]/g, (c) => (c === "-" ? "\\-" : "\\s+"))}\\b`, "i");
      expect(isi.filter((b) => pola.test(b.teks)).map((b) => b.nama)).toEqual([]);
    });
  }
});
