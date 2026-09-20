import type { Metadata } from "next";
import { Archivo, IBM_Plex_Mono, Instrument_Sans, Newsreader } from "next/font/google";
import type { ReactNode } from "react";
import contohSimulasi from "../../../data/fixtures/simulasi/contoh-3f8c.json";
import "@petasurya/ui/tokens.css";
import { Footer } from "../components/Footer";
import { Header } from "../components/Header";
import { PenyediaTema } from "../components/Tema";
import s from "./layout.module.css";

// Empat peran huruf (§01). Di-host sendiri saat build sehingga jalan luring.
// Nama variabel harus sama dengan yang dirujuk --f-* di tokens.css.
const archivo = Archivo({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  variable: "--font-archivo",
  display: "swap",
});
const instrumentSans = Instrument_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-instrument-sans",
  display: "swap",
});
const newsreader = Newsreader({
  subsets: ["latin"],
  weight: ["400", "500"],
  style: ["normal", "italic"],
  variable: "--font-newsreader",
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

const kelasFont = [archivo, instrumentSans, newsreader, plexMono].map((f) => f.variable).join(" ");
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
