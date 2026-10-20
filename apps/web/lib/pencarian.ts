import type { BangunanRingkas } from "@petasurya/contracts";
import { namaBangunan } from "./pemindaian";

export type FilterBangunan = "semua" | "tersimpan";
export type UrutanBangunan = "nama" | "luas-terbesar" | "luas-terkecil";
export type PilihanKatalog = { query: string; filter: FilterBangunan; urutan: UrutanBangunan };

const pembandingNama = new Intl.Collator("id-ID", { numeric: true, sensitivity: "base" });

export function bacaPilihanKatalog(params: Record<string, string | string[] | undefined>): PilihanKatalog {
  const pertama = (nilai: string | string[] | undefined) => Array.isArray(nilai) ? nilai[0] : nilai;
  const urutan = pertama(params.urut);
  return {
    query: pertama(params.q) ?? "",
    filter: pertama(params.filter) === "tersimpan" ? "tersimpan" : "semua",
    urutan: urutan === "luas-terbesar" || urutan === "luas-terkecil" ? urutan : "nama",
  };
}

export function tautanKatalog({ query, filter, urutan }: PilihanKatalog): string {
  const params = new URLSearchParams();
  if (query.trim()) params.set("q", query.trim());
  if (filter !== "semua") params.set("filter", filter);
  if (urutan !== "nama") params.set("urut", urutan);
  const kueri = params.toString();
  return kueri ? `/peta?${kueri}` : "/peta";
}

export function urutkanBangunan(daftar: BangunanRingkas[], urutan: UrutanBangunan): BangunanRingkas[] {
  return [...daftar].sort((a, b) => {
    const luas = urutan === "luas-terbesar" ? b.footprint_m2 - a.footprint_m2
      : urutan === "luas-terkecil" ? a.footprint_m2 - b.footprint_m2 : 0;
    return luas || Number(Boolean(b.nama)) - Number(Boolean(a.nama))
      || pembandingNama.compare(namaBangunan(a), namaBangunan(b)) || a.id - b.id;
  });
}

const JENIS_BANGUNAN: Record<string, string> = {
  house: "rumah hunian tempat tinggal",
  residential: "rumah hunian tempat tinggal",
  apartments: "apartemen hunian tempat tinggal",
  dormitory: "asrama hunian",
  university: "kampus universitas pendidikan",
  college: "kampus pendidikan",
  school: "sekolah pendidikan",
  retail: "toko usaha umkm perdagangan",
  commercial: "toko usaha umkm komersial",
  office: "kantor usaha",
  mosque: "masjid ibadah",
  hospital: "rumah sakit kesehatan",
  warehouse: "gudang usaha",
};

function normalisasi(teks: string): string {
  return teks.normalize("NFD").replace(/\p{M}/gu, "").toLocaleLowerCase("id-ID").trim();
}

/** Setiap kata boleh cocok dengan nama, jenis, atau ID bangunan. */
export function cariBangunan(daftar: BangunanRingkas[], kueri: string): BangunanRingkas[] {
  const kata = normalisasi(kueri).split(/\s+/).filter(Boolean);
  if (!kata.length) return [...daftar];

  return daftar.filter((bangunan) => {
    const jenis = bangunan.building_tag ?? "";
    const nama = namaBangunan(bangunan);
    const kampus = /\b(unib|universitas|fakultas|dekanat)\b/i.test(nama) ? "kampus universitas pendidikan" : "";
    const usaha = /\b(toko|warung|minimarket|indomaret|alfamart)\b/i.test(nama) ? "toko usaha umkm perdagangan" : "";
    const teks = normalisasi([nama, bangunan.id, jenis, JENIS_BANGUNAN[jenis], kampus, usaha].join(" "));
    return kata.every((bagian) => teks.includes(bagian));
  });
}
