import type { Metadata } from "next";
import { BerandaInteraktif } from "@/components/Beranda";
import { bacaPilihanKatalog } from "@/lib/pencarian";

export const metadata: Metadata = {
  title: "Peta bangunan",
  description: "Pilih bangunan di Indonesia, tinjau atap, lalu hitung potensi PLTS.",
};

// Katalog lokal ikut bundel klien; tambahan dari engine dimuat di peramban agar halaman tidak menunggu jaringan.
export default async function HalamanPeta({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = searchParams ? await searchParams : {};
  const { query, filter, urutan } = bacaPilihanKatalog(params);
  return <BerandaInteraktif query={query} filterAwal={filter} urutanAwal={urutan} />;
}
