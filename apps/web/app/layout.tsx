import type { Metadata } from "next";
import { Geist, IBM_Plex_Mono, Inter } from "next/font/google";
import type { ReactNode } from "react";
import "@petasurya/ui/tokens.css";
import "./transisi.css";
import { PenyediaTema } from "@/components/Tema";
import { TransisiHalaman } from "@/components/TransisiHalaman";

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
  applicationName: "PetaSurya",
  openGraph: {
    type: "website",
    locale: "id_ID",
    siteName: "PetaSurya",
    title: "PetaSurya — Atapmu, dihitung.",
    description: "Kenali potensi energi dan penghematan atap Anda. Jelajahi peta bangunan dan uji skenario PLTS atap di Bengkulu.",
  },
  twitter: {
    card: "summary",
    title: "PetaSurya — Atapmu, dihitung.",
    description: "Peta potensi PLTS atap di Bengkulu. Pilih bangunan, tinjau atap, lalu hitung potensi energi dan penghematan.",
  },
};

const kelasFont = [geist, inter, plexMono].map((f) => f.variable).join(" ");

const skripTemaAwal = `
(function () {
  try {
    var tema = localStorage.getItem("petasurya-theme");
    document.documentElement.dataset.theme = tema === "light" ? "light" : "dark";
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
          <TransisiHalaman />
          {children}
        </PenyediaTema>
      </body>
    </html>
  );
}
