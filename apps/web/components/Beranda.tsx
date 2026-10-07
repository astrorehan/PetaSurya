"use client";

import Link from "next/link";
import { useCallback, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, ChevronRight, Scan, Search } from "lucide-react";
import type { BangunanRingkas } from "@petasurya/contracts";
import { Ikon, Lencana, Tombol, kelasTautan, m2 } from "@petasurya/ui";
import { Peta, type BangunanPeta } from "./Peta";
import { PemindaiAtap } from "./PemindaiAtap";
import s from "./beranda.module.css";

function namaBangunan(item: BangunanRingkas) {
  if (item.nama) return item.nama;
  if (item.building_tag === "house") return "Rumah Kandang Limun";
  return `Bangunan ${item.id}`;
}

function cocokDengan(item: BangunanRingkas, query: string) {
  const teks = [item.id, namaBangunan(item), item.source_ref, item.building_tag].filter(Boolean).join(" ").toLowerCase();
  return teks.includes(query.trim().toLowerCase());
}

export function BerandaInteraktif({ bangunan, query }: { bangunan: BangunanRingkas[]; query: string }) {
  const router = useRouter();
  const [idModalPindai, setIdModalPindai] = useState<number | null>(null);
  const mencari = Boolean(query.trim());
  const hasil = useMemo(
    () => mencari ? bangunan.filter((item) => cocokDengan(item, query)) : bangunan,
    [bangunan, query, mencari],
  );
  const bangunanPeta = useMemo<BangunanPeta[]>(
    () => hasil.map((item) => ({ id: item.id, nama: namaBangunan(item), geom: item.geom })),
    [hasil],
  );
  const pilihBangunan = useCallback((id: number) => router.push(`/atap/${id}`), [router]);

  return (
    <main className={s.halaman}>
      <header className={s.kepala}>
        <div>
          <p className={s.label}>Potensi PLTS atap</p>
          <h1 className={s.judul}>Pilih atapmu.</h1>
        </div>
        <div className={s.lokasi}>
          <span>Bengkulu</span>
          <Lencana contoh>Data contoh</Lencana>
        </div>
      </header>

      <section className={s.barisPeta} aria-label="Peta dan bangunan contoh">
        <div className={s.kolomPeta}>
          <Peta className={s.petaBeranda} label="Peta bangunan contoh di Bengkulu" tinggi={520} bangunan={bangunanPeta} onPilihBangunan={pilihBangunan} />
        </div>
        <aside className={s.status} aria-labelledby="judul-daftar">
          <div className={s.kepalaDaftar}>
            <h2 id="judul-daftar" className={s.statusJudul}>{mencari ? "Hasil pencarian" : "Bangunan contoh"}</h2>
            <span className={s.jumlah} aria-label={`${hasil.length} bangunan`}>{hasil.length}</span>
          </div>
          <p className={s.statusTeks}>
            {mencari ? `Untuk “${query}” · ${bangunan.length} bangunan contoh` : `Pencarian terbatas pada ${bangunan.length} bangunan ini.`}
          </p>

          {hasil.length ? (
            <ul className={s.daftarBangunan} aria-label="Bangunan yang bisa dipilih">
              {hasil.map((item) => (
                <li key={item.id}>
                  <Link href={`/atap/${item.id}`} className={s.bangunan} aria-label={`Lihat hasil ${namaBangunan(item)}, luas bangunan ${m2(item.footprint_m2)}`}>
                    <span className={s.ringkasanBangunan}>
                      <strong>{namaBangunan(item)}</strong>
                      <span>Luas bangunan <span className="num">{m2(item.footprint_m2)}</span></span>
                    </span>
                    <Ikon ikon={ChevronRight} />
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <div className={s.keadaanKosong}>
              <Ikon ikon={Search} ukuran={20} />
              <p>Bangunan tidak ditemukan.</p>
              <Link href="/" className={kelasTautan()}>Tampilkan semua contoh</Link>
            </div>
          )}

          <div className={s.aksiPindai}>
            <Tombol ikon={Scan} onClick={() => setIdModalPindai(hasil[0]?.id ?? bangunan[0]?.id ?? 991016391)}>
              Coba pindai atap
            </Tombol>
            <span className={s.demo}>Demo</span>
          </div>

          <details className={s.tentangData}>
            <summary>Tentang data <Ikon ikon={ChevronDown} /></summary>
            <p>Bangunan dari OpenStreetMap. Hasil awal memakai data contoh; pencarian alamat umum belum tersedia.</p>
            <Link href="/sumber-data" className={kelasTautan()}>Lihat sumber data</Link>
          </details>
        </aside>
      </section>

      {idModalPindai !== null ? (
        <PemindaiAtap bangunanAwalId={idModalPindai} mode="modal" onTutup={() => setIdModalPindai(null)} />
      ) : null}
    </main>
  );
}
