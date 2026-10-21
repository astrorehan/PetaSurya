import type { Metadata } from "next";
import { HalamanBrand } from "@/components/HalamanBrand";

export const metadata: Metadata = {
  title: { absolute: "PetaSurya — Atapmu, dihitung." },
  description:
    "Kenali potensi energi dan penghematan atap Anda sebelum berinvestasi. Jelajahi analisis PLTS atap PetaSurya di Bengkulu.",
};

// Statis: pencarian lama `/?q=` diteruskan ke `/peta` oleh redirects di next.config.ts.
export default function Beranda() {
  return <HalamanBrand />;
}
