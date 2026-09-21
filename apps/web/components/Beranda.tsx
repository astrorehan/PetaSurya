"use client";

import Link from "next/link";
import { useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import type { BangunanRingkas } from "@petasurya/contracts";
import { m2 } from "@petasurya/ui";
import { Peta, type BangunanPeta } from "./Peta";
import s from "./beranda.module.css";

function namaBangunan(item: BangunanRingkas) {
  if (item.nama) return item.nama;
  if (item.building_tag === "house") return "Rumah tanpa nama";
  return `Bangunan ${item.id}`;
}

function cocokDengan(item: BangunanRingkas, query: string) {
  const teks = [item.id, item.nama, item.source_ref, item.building_tag].filter(Boolean).join(" ").toLowerCase();
  return teks.includes(query.trim().toLowerCase());
}

function RingkasanBangunan({ item }: { item: BangunanRingkas }) {
  return (
    <div className={s.ringkasanBangunan}>
      <div>
        <strong>{namaBangunan(item)}</strong>
        <span className="num">{item.source_ref}</span>
      </div>
      <span>{m2(item.footprint_m2)} · {item.building_tag ?? "tag tidak tersedia"}</span>
    </div>
  );
}

export function BerandaInteraktif({ bangunan, query }: { bangunan: BangunanRingkas[]; query: string }) {
  const router = useRouter();
  const hasil = useMemo(
    () => query.trim() ? bangunan.filter((item) => cocokDengan(item, query)) : bangunan,
    [bangunan, query],
  );
  const bangunanPeta = useMemo<BangunanPeta[]>(
    () => bangunan.map((item) => ({ id: item.id, nama: namaBangunan(item), geom: item.geom })),
    [bangunan],
  );
  const pilihBangunan = useCallback((id: number) => router.push(`/atap/${id}`), [router]);

  return (
    <main className={s.halaman}>
      <section className={s.kepala} aria-labelledby="judul-beranda">
        <div>
          <p className={s.label}>PETA POTENSI PLTS ATAP</p>
          <h1 id="judul-beranda" className={s.judul}>Cari satu lokasi.</h1>
          <p className={s.pengantar}>
            Pencarian ini masih lokal pada tiga fixture Kota Bengkulu. Hasil nyata dari geocoding menyusul.
          </p>
        </div>
      </section>

      <section className={s.barisPeta} aria-label="Peta dan bangunan contoh">
        <div className={s.kolomPeta}>
          <Peta label="Peta tiga bangunan contoh di Bengkulu" tinggi={520} bangunan={bangunanPeta} onPilihBangunan={pilihBangunan} />
          <p className={s.keteranganPeta}>Tiga bidang amber adalah fixture bangunan nyata dari OpenStreetMap. Klik bidang atau pilih nama untuk melihat hasil.</p>
        </div>
        <aside className={s.status} aria-labelledby="judul-daftar">
          <div>
            <p className={s.label}>{query ? "HASIL PENCARIAN LOKAL" : "CONTOH DI BENGKULU"}</p>
            <h2 id="judul-daftar" className={s.statusJudul}>
              {query ? `${hasil.length} bangunan ditemukan` : "Pilih bangunan"}
            </h2>
            <p className={s.statusTeks}>
              {query ? `Kecocokan untuk “${query}”.` : "Belum mencari? Mulai dari salah satu fixture di bawah."}
            </p>
          </div>

          {hasil.length ? (
            <ul className={s.daftarBangunan} aria-label="Bangunan yang bisa dipilih">
              {hasil.map((item) => (
                <li key={item.id}>
                  <Link href={`/atap/${item.id}`}>
                    <RingkasanBangunan item={item} />
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <div className={s.keadaanKosong}>
              <p>Tidak ada fixture yang cocok.</p>
              <Link href="/">Tampilkan tiga contoh</Link>
            </div>
          )}

          <p className={s.statusCatatan}>Alamat umum dan geocoding belum tersambung. Jangan menganggap daftar ini mencakup seluruh Kota Bengkulu.</p>
        </aside>
      </section>
    </main>
  );
}
