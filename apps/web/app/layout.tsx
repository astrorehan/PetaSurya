import type { Metadata } from "next";
import { Archivo, IBM_Plex_Mono, Instrument_Sans, Newsreader } from "next/font/google";
import type { ReactNode } from "react";
import "@petasurya/ui/tokens.css";

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
  title: "PetaSurya",
  description: "Peta potensi PLTS atap tingkat bangunan untuk Indonesia. Atapmu, dihitung.",
};

const kelasFont = [archivo, instrumentSans, newsreader, plexMono].map((f) => f.variable).join(" ");

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="id" className={kelasFont}>
      <body>{children}</body>
    </html>
  );
}
