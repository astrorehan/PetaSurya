import { readFileSync } from "node:fs";
import path from "node:path";
import { tokenTema } from "@petasurya/ui";

/*
 * tokens.css dibaca saat render, bukan disalin: tabel warna dan ukuran di
 * lembar ini selalu sama dengan berkas yang dipakai produk dan diuji
 * kontras.test.ts. process.cwd() = apps/web (dev dan build).
 */
export const CSS_TOKEN = readFileSync(path.resolve(process.cwd(), "../../packages/ui/src/tokens.css"), "utf8");

export type Tema = "terang" | "gelap";

export const WARNA: Record<Tema, Record<string, string>> = {
  terang: tokenTema(CSS_TOKEN, "terang"),
  gelap: tokenTema(CSS_TOKEN, "gelap"),
};

/** Token netral-tema dari blok :root pertama, nilai mentah apa adanya. */
export function tokenAkar(): Record<string, string> {
  const awal = CSS_TOKEN.indexOf(":root {");
  const akhir = CSS_TOKEN.indexOf("\n}", awal);
  const blok = CSS_TOKEN.slice(awal, akhir).replace(/\/\*[\s\S]*?\*\//g, "");
  const hasil: Record<string, string> = {};
  for (const m of blok.matchAll(/(--[a-z0-9-]+):\s*([^;]+);/g)) hasil[m[1]] = m[2].trim().replace(/\s+/g, " ");
  return hasil;
}

/** Nilai token di blok media (mis. --kontrol-h saat pointer: coarse). */
export function tokenMedia(media: string, token: string): string | undefined {
  const awal = CSS_TOKEN.indexOf(`@media ${media}`);
  if (awal < 0) return undefined;
  const blok = CSS_TOKEN.slice(awal, CSS_TOKEN.indexOf("\n}", awal));
  return new RegExp(`${token}:\\s*([^;]+);`).exec(blok)?.[1].trim();
}

const ID = "id-ID";
const desimal = (n: number) => n.toLocaleString(ID, { maximumFractionDigits: 2 });

/** Mengganti var(--x) dengan nilainya di blok :root, berulang sampai habis. */
function urai(nilai: string, akar: Record<string, string>): string {
  let hasil = nilai;
  for (let i = 0; i < 5 && hasil.includes("var(--"); i++) {
    hasil = hasil.replace(/var\((--[a-z0-9-]+)(?:,[^)]*)?\)/g, (_, k: string) => akar[k] ?? k);
  }
  return hasil;
}

/** "0.75rem" → "12 px"; clamp(a, …, b) → "a–b px" (rem atau px). Basis 16 px. */
export function ukuranPx(nilai: string): string {
  const px = [...nilai.matchAll(/([\d.]+)(rem|px)\b/g)].map((m) => Number(m[1]) * (m[2] === "rem" ? 16 : 1));
  if (!px.length) return nilai;
  if (nilai.startsWith("clamp") && px.length >= 2) return `${desimal(px[0])}–${desimal(px[px.length - 1])} px`;
  return `${desimal(px[0])} px`;
}

/**
 * Spesifikasi peran huruf dari tokens.css, mis. --tipe-display →
 * { keluarga: "Geist", berat: "600", ukuran: "48–72 px", leading: "1,1" }.
 */
export function spesifikasiTipe(peran: string) {
  const akar = tokenAkar();
  const mentah = akar[`--tipe-${peran}`] ?? "";
  const m = /^(\d+)\s+(var\(--[a-z0-9-]+\))\s*\/\s*(\S+)\s+(var\(--f-[a-z]+\))$/.exec(mentah);
  if (!m) return null;
  const keluarga = /"([^"]+)"/.exec(akar[m[4].slice(4, -1)] ?? "")?.[1] ?? m[4];
  const leading = Number(urai(m[3], akar));
  return {
    keluarga,
    berat: m[1],
    ukuran: ukuranPx(urai(m[2], akar)),
    leading: Number.isFinite(leading) ? desimal(leading) : urai(m[3], akar),
  };
}

/** "-0.02em" → "−0,02em". */
export function tracking(token: string): string {
  const v = tokenAkar()[token] ?? "0";
  const n = parseFloat(v);
  return `${n < 0 ? "−" : n > 0 ? "+" : ""}${desimal(Math.abs(n))}em`;
}
