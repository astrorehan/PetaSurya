import fs from "node:fs";
import path from "node:path";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { HasilAgregasi } from "@petasurya/contracts";
import { KotaInteraktif } from "@/components/Kota";
import { bacaWilayahKota } from "@/lib/wilayahKota";

export const metadata: Metadata = {
  title: "Mode Kota Bengkulu",
  description: "Uji skenario adopsi PLTS atap di Kota Bengkulu. Tinjau kapasitas, energi, investasi, dan emisi per kecamatan dengan asumsi yang dapat diubah.",
};

export default async function HalamanKota({ params }: { params: Promise<{ kode: string }> }) {
  const { kode } = await params;
  if (kode !== "1771") notFound();
  const berkas = path.resolve(process.cwd(), "../../data/fixtures/agregasi/kota-bengkulu.json");
  const awal = HasilAgregasi.parse(JSON.parse(fs.readFileSync(berkas, "utf8")));
  return <KotaInteraktif kode={kode} wilayah={bacaWilayahKota()} awal={awal} />;
}
