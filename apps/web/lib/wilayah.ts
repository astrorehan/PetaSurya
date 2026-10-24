import type { AsumsiSimulasi, BangunanRingkas, InfoWilayah } from "@petasurya/contracts";
import { muatWilayah } from "./api";
import { BATAS_KOTA, pusatBangunan } from "./pemindaian";

const sudah = new Map<string, Promise<InfoWilayah | null>>();

/** Bangunan di dalam kotak Kota Bengkulu: asumsi bawaan (faktor emisi Sumatera 0,84) tidak diganti. */
export function diKotaBengkulu(b: BangunanRingkas): boolean {
  const [lon, lat] = pusatBangunan(b);
  return lon >= BATAS_KOTA[0] && lon <= BATAS_KOTA[2] && lat >= BATAS_KOTA[1] && lat <= BATAS_KOTA[3];
}

/**
 * Provinsi dan sistem jaringan di titik bangunan, atau null bila engine tidak
 * menjawab. Hasil dipakai ulang per sel 0,01° agar hitung ulang tidak memanggil engine lagi.
 */
export function wilayahBangunan(b: BangunanRingkas): Promise<InfoWilayah | null> {
  const [lon, lat] = pusatBangunan(b);
  const kunci = `${lat.toFixed(2)},${lon.toFixed(2)}`;
  let janji = sudah.get(kunci);
  if (!janji) {
    janji = muatWilayah(lat, lon).catch(() => null);
    sudah.set(kunci, janji);
    // Kegagalan tidak disimpan: percobaan berikutnya boleh mencoba lagi.
    void janji.then((hasil) => { if (!hasil) sudah.delete(kunci); });
  }
  return janji;
}

const ANGKA = new Intl.NumberFormat("id-ID", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/** Wilayah dikenali tetapi tidak punya faktor emisi: pengguna wajib mengisi sebelum menghitung. */
export function perluFaktorEmisi(wilayah: InfoWilayah | null, bangunan: BangunanRingkas): boolean {
  return wilayah !== null && wilayah.ef_grid_tco2_mwh === null && !diKotaBengkulu(bangunan);
}

/** Isian pengguna (titik atau koma desimal) menjadi angka positif, atau null bila tidak sah. */
export function bacaFaktorEmisi(teks: string | null | undefined): number | null {
  const angka = Number((teks ?? "").trim().replace(",", "."));
  return Number.isFinite(angka) && angka > 0 && angka < 10 ? angka : null;
}

/** Petunjuk di samping isian faktor emisi; rentang antarsistem ditampilkan bila diketahui. */
export function petunjukFaktorEmisi(wilayah: InfoWilayah): string {
  const [rendah, tinggi] = wilayah.rentang_tco2_mwh ?? [];
  return rendah !== undefined && tinggi !== undefined
    ? `Sistem listrik di wilayah ini beragam: ${ANGKA.format(rendah)}–${ANGKA.format(tinggi)} tCO₂/MWh. Isi faktor emisi.`
    : "Faktor emisi wilayah ini belum tersedia. Isi faktor emisi.";
}

/**
 * Faktor emisi bawaan skenario diganti faktor wilayah bila ada dan bangunan di luar Kota Bengkulu.
 * Wilayah tanpa faktor memakai isian pengguna (`manual`); tanpa isian asumsi dikembalikan apa adanya
 * dan pemanggil wajib menahan perhitungan (lihat `perluFaktorEmisi`).
 */
export function asumsiDenganWilayah(asumsi: AsumsiSimulasi, wilayah: InfoWilayah | null, bangunan: BangunanRingkas, manual?: number | null): AsumsiSimulasi {
  if (diKotaBengkulu(bangunan)) return asumsi;
  if (wilayah?.ef_grid_tco2_mwh) return { ...asumsi, ef_grid_tco2_mwh: wilayah.ef_grid_tco2_mwh };
  if (perluFaktorEmisi(wilayah, bangunan) && manual) return { ...asumsi, ef_grid_tco2_mwh: manual };
  return asumsi;
}

/** Wilayah untuk lembar "Cara hitung" dan panel asumsi; bagian opsional hanya muncul bila ada. */
export function barisWilayah(wilayah: InfoWilayah | null, bangunan: BangunanRingkas): [string, string][] {
  if (wilayah) {
    const baris: [string, string][] = [["Wilayah", wilayah.sistem_grid ? `${wilayah.provinsi_nama} · ${wilayah.sistem_grid}` : wilayah.provinsi_nama]];
    if (wilayah.status === "perkiraan") baris.push(["Status faktor", "Perkiraan: sistem utama dipilih PetaSurya"]);
    if (wilayah.ef_grid_tco2_mwh === null) baris.push(["Status faktor", "Belum ada faktor resmi provinsi; nilai diisi pengguna"]);
    return baris;
  }
  return diKotaBengkulu(bangunan) ? [] : [["Wilayah", "Belum dikenali; faktor emisi bawaan Sumatera"]];
}
