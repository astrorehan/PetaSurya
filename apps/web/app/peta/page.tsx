import type { Metadata } from "next";
import { KATALOG_BANGUNAN } from "../../lib/pemindaian";
import { BerandaInteraktif } from "../../components/Beranda";
import { muatKatalog } from "../../lib/api";

export const metadata: Metadata = {
  title: "Peta bangunan",
  description: "Pilih bangunan di Bengkulu, tinjau atap, lalu hitung potensi PLTS.",
};

export default async function HalamanPeta({
  searchParams,
}: {
  searchParams?: Promise<{ q?: string | string[] }>;
}) {
  const params = searchParams ? await searchParams : {};
  const query = Array.isArray(params.q) ? params.q[0] ?? "" : params.q ?? "";
  const bangunan = await muatKatalog().catch(() => KATALOG_BANGUNAN);
  return <BerandaInteraktif bangunan={bangunan} query={query} />;
}
