import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { HalamanBrand } from "../components/HalamanBrand";

export const metadata: Metadata = {
  title: "PetaSurya — Atapmu, dihitung.",
  description:
    "Kenali potensi energi dan penghematan atap Anda sebelum berinvestasi. Jelajahi analisis PLTS atap PetaSurya di Bengkulu.",
};

export default async function Beranda({
  searchParams,
}: {
  searchParams?: Promise<{ q?: string | string[] }>;
}) {
  const params = searchParams ? await searchParams : {};
  if (params.q !== undefined) {
    const query = Array.isArray(params.q) ? params.q[0] ?? "" : params.q;
    redirect(`/peta?q=${encodeURIComponent(query)}`);
  }
  return <HalamanBrand />;
}
