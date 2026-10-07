import type { Metadata } from "next";
import { PemindaiAtap } from "../../components/PemindaiAtap";

export const metadata: Metadata = {
  title: "Pindai atap",
  description:
    "Demo visual batas atap, penghalang, dan susunan panel surya pada bangunan contoh.",
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
