import { BATAS_INDONESIA } from "./cakupan";

/**
 * Akurasi (radius 68%, m) di atas batas ini terlalu lebar untuk menunjuk satu rumah:
 * footprint rumah di Bengkulu umumnya 56–372 m² (sisi ±8–20 m), jadi titik ±50 m
 * sudah bisa jatuh dua sampai tiga rumah dari rumah sebenarnya.
 */
export const AKURASI_RUMAH_M = 50;

export type LokasiPerangkat = { lat: number; lon: number; akurasi_m: number };

export type HasilLokasi =
  | { jenis: "siap"; lokasi: LokasiPerangkat; tepat: boolean }
  | { jenis: "galat"; pesan: string };

/** Kode GeolocationPositionError: 1 izin ditolak, 2 posisi tidak tersedia, 3 waktu habis. */
export function pesanGalatLokasi(kode: number): string {
  if (kode === 1) return "Izin lokasi ditolak. Izinkan lokasi untuk situs ini di pengaturan peramban, atau cari alamat.";
  if (kode === 3) return "Lokasi belum didapat. Coba lagi di tempat terbuka.";
  return "Lokasi perangkat tidak tersedia. Cari alamat atau tempel koordinat.";
}

export function nilaiLokasi(lat: number, lon: number, akurasi_m: number): HasilLokasi {
  const [barat, selatan, timur, utara] = BATAS_INDONESIA;
  if (!Number.isFinite(lat) || !Number.isFinite(lon) || lon < barat || lon > timur || lat < selatan || lat > utara) {
    return { jenis: "galat", pesan: "Lokasi Anda di luar wilayah Indonesia." };
  }
  const akurasi = Number.isFinite(akurasi_m) && akurasi_m >= 0 ? akurasi_m : Number.POSITIVE_INFINITY;
  return { jenis: "siap", lokasi: { lat, lon, akurasi_m: akurasi }, tepat: akurasi <= AKURASI_RUMAH_M };
}

/** Membaca lokasi perangkat sekali; GPS diminta bila ada, posisi berumur ≤ 1 menit boleh dipakai ulang. */
export function bacaLokasi(geo: Geolocation | undefined): Promise<HasilLokasi> {
  if (!geo) return Promise.resolve({ jenis: "galat", pesan: pesanGalatLokasi(2) });
  return new Promise((selesai) => {
    geo.getCurrentPosition(
      (p) => selesai(nilaiLokasi(p.coords.latitude, p.coords.longitude, p.coords.accuracy)),
      (e) => selesai({ jenis: "galat", pesan: pesanGalatLokasi(e.code) }),
      { enableHighAccuracy: true, timeout: 15_000, maximumAge: 60_000 },
    );
  });
}
