import type { Metadata } from "next";
import { Geist, IBM_Plex_Mono, Inter } from "next/font/google";
import type { ReactNode } from "react";
import contohSimulasi from "../../../data/fixtures/simulasi/contoh-3f8c.json";
import "@petasurya/ui/tokens.css";
import { Footer } from "../components/Footer";
import { Header } from "../components/Header";
import { PenyediaTema } from "../components/Tema";
import s from "./layout.module.css";

// Pasangan Arc di-host sendiri saat build; data memakai angka tabular mono.
const geist = Geist({
  subsets: ["latin"],
  variable: "--font-geist",
  display: "swap",
});
const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});
const plexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-plex-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "PetaSurya",
    template: "%s · PetaSurya",
  },
  description: "Peta potensi PLTS atap tingkat bangunan untuk Indonesia. Atapmu, dihitung.",
};

const kelasFont = [geist, inter, plexMono].map((f) => f.variable).join(" ");
const engineVersion = contohSimulasi.engine_version;

const skripTemaAwal = `
(function () {
  try {
    var tema = localStorage.getItem("petasurya-theme");
    if (tema === "light" || tema === "dark") document.documentElement.dataset.theme = tema;
  } catch (_) {}
})();`;

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="id" className={kelasFont} suppressHydrationWarning>
      <head>
        <script id="tema-awal" dangerouslySetInnerHTML={{ __html: skripTemaAwal }} />
      </head>
      <body>
        <PenyediaTema>
          <Header />
          <div className={s.isi}>{children}</div>
          <Footer engineVersion={engineVersion} />
        </PenyediaTema>
      </body>
    </html>
  );
}
