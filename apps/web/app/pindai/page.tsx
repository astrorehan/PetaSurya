import type { Metadata } from "next";
import { PemindaiAtap } from "../../components/PemindaiAtap";

export const metadata: Metadata = {
  title: "Pindai atap",
  description:
    "Pilih bangunan, tinjau batas dan luas atap, lalu hitung potensi energi dan penghematan.",
};

export default async function HalamanPindai({
  searchParams,
}: {
  searchParams: Promise<{ id?: string }>;
}) {
  const { id } = await searchParams;
  const targetId = id ? Number(id) : undefined;

  return <PemindaiAtap bangunanAwalId={targetId} mode="halaman" />;
}
