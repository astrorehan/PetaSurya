import katex from "katex";
import "katex/dist/katex.min.css";
import { useMemo } from "react";

/** Teks biasa → \text{…} aman untuk KaTeX (karakter khusus TeX di-escape). */
export function teks(nilai: string): string {
  const aman = nilai
    .replace(/ /g, " ")
    .replace(/\\/g, "\\textbackslash ")
    .replace(/([%#&_$])/g, "\\$1")
    .replace(/([{}])/g, "\\$1")
    .replace(/\^/g, "\\^{}");
  return `\\text{${aman}}`;
}

/**
 * Rumus tampilan (display math) dirender di server dan klien dengan keluaran
 * HTML + MathML, sehingga pembaca layar membaca struktur matematikanya.
 */
export function Rumus({ tex, className, label }: { tex: string; className?: string; label?: string }) {
  const html = useMemo(
    () => katex.renderToString(tex, { displayMode: true, throwOnError: false, output: "htmlAndMathml", strict: false }),
    [tex],
  );
  return <div className={className} aria-label={label} dangerouslySetInnerHTML={{ __html: html }} />;
}
