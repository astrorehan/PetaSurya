import type { Metadata } from "next";
import { KATALOG_BANGUNAN } from "../../lib/pemindaian";
import { BerandaInteraktif } from "../../components/Beranda";
import { muatKatalog } from "../../lib/api";
import { bacaPilihanKatalog } from "../../lib/pencarian";

export const metadata: Metadata = {
  title: "Peta bangunan",
  description: "Pilih bangunan di Bengkulu, tinjau atap, lalu hitung potensi PLTS.",
};

export default async function HalamanPeta({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = searchParams ? await searchParams : {};
  const { query, filter, urutan } = bacaPilihanKatalog(params);
  const bangunan = await muatKatalog().catch(() => KATALOG_BANGUNAN);
  return <BerandaInteraktif bangunan={bangunan} query={query} filterAwal={filter} urutanAwal={urutan} />;
}
