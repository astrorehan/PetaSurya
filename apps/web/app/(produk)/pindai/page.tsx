import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PemindaiAtap } from "@/components/PemindaiAtap";

export const metadata: Metadata = {
  title: "Pindai atap",
  description:
    "Pilih bangunan, tinjau batas dan luas atap, lalu hitung potensi energi dan penghematan.",
};

export default async function HalamanPindai({
  searchParams,
}: {
  searchParams: Promise<{ id?: string | string[] }>;
}) {
  const params = await searchParams;
  const id = Array.isArray(params.id) ? params.id[0] : params.id;
  if (id !== undefined && (!/^\d+$/.test(id) || !Number.isSafeInteger(Number(id)) || Number(id) <= 0)) notFound();
  const targetId = id === undefined ? undefined : Number(id);

  return <PemindaiAtap bangunanAwalId={targetId} mode="halaman" />;
}
