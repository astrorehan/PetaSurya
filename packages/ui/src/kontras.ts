/*
 * Rasio kontras WCAG 2.x: (L1 + 0,05) / (L2 + 0,05), L = luminansi relatif sRGB.
 * Sumber: https://www.w3.org/TR/WCAG21/#dfn-contrast-ratio
 */
export function luminansi(hex: string): number {
  const h = hex.replace("#", "");
  const c = h.length === 3 ? h.split("").map((x) => x + x) : [h.slice(0, 2), h.slice(2, 4), h.slice(4, 6)];
  const [r, g, b] = c.map((x) => {
    const v = parseInt(x, 16) / 255;
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function kontras(a: string, b: string): number {
  const la = luminansi(a);
  const lb = luminansi(b);
  const [terang, gelap] = la > lb ? [la, lb] : [lb, la];
  return (terang + 0.05) / (gelap + 0.05);
}

/**
 * Membaca token warna hex dari tokens.css untuk satu tema.
 * "terang" = blok yang selektornya memuat [data-theme="light"];
 * "gelap" = blok yang selektornya memuat [data-theme="dark"]
 * (isinya identik dengan blok prefers-color-scheme).
 */
export function tokenTema(css: string, tema: "terang" | "gelap"): Record<string, string> {
  const dicari = tema === "terang" ? '[data-theme="light"]' : '[data-theme="dark"]';
  const hasil: Record<string, string> = {};
  // Blok datar "selektor { isi }"; blok @media dilewati karena isinya bersarang.
  for (const m of css.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
    const selektor = m[1]
      .replace(/\/\*[\s\S]*?\*\//g, "")
      .split(",")
      .map((s) => s.trim());
    if (!selektor.includes(dicari)) continue;
    for (const t of m[2].matchAll(/(--[a-z0-9-]+):\s*(#[0-9a-f]{3,6})\s*;/gi)) hasil[t[1]] = t[2];
  }
  return hasil;
}
