import type { Metadata } from "next";
import { PemindaiAtap } from "../../components/PemindaiAtap";

export const metadata: Metadata = {
  title: "Demo Pemindaian Atap · PetaSurya",
  description:
    "Demonstrasi visual pipeline Computer Vision L2 untuk segmentasi kontur atap, penapisan obstruksi, dan penataan modul fotovoltaik surya.",
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
