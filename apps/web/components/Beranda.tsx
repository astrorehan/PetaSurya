"use client";

import Link from "next/link";
import { useCallback, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Crosshair, Scan } from "lucide-react";
import type { BangunanRingkas } from "@petasurya/contracts";
import { m2 } from "@petasurya/ui";
import { Peta, type BangunanPeta } from "./Peta";
import { PemindaiAtap } from "./PemindaiAtap";
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

function RingkasanBangunan({
  item,
  onBukaPindai,
}: {
  item: BangunanRingkas;
  onBukaPindai: (id: number) => void;
}) {
  return (
    <div className={s.ringkasanBangunan}>
      <Link href={`/atap/${item.id}`} style={{ textDecoration: "none", color: "inherit" }}>
        <div>
          <strong>{namaBangunan(item)}</strong>
          <span className="num">{item.source_ref}</span>
        </div>
        <span>{m2(item.footprint_m2)} · {item.building_tag ?? "tag tidak tersedia"}</span>
      </Link>
      <div className={s.itemAksiBaris}>
        <button
          className={s.tombolPindaiKecil}
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onBukaPindai(item.id);
          }}
          title="Buka simulasi pemindaian atap visual"
        >
          <Crosshair size={13} aria-hidden="true" />
          <span>Pindai Atap (Demo)</span>
        </button>
        <Link href={`/atap/${item.id}`} className={s.tombolPindaiKecil}>
          <span>Lihat Hasil →</span>
        </Link>
      </div>
    </div>
  );
}

export function BerandaInteraktif({ bangunan, query }: { bangunan: BangunanRingkas[]; query: string }) {
  const router = useRouter();
  const [idModalPindai, setIdModalPindai] = useState<number | null>(null);

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
            Pencarian ini masih lokal pada tiga fixture Kota Bengkulu. Pilih bangunan di peta atau jalankan demonstrasi pemindaian atap.
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
              {query ? `Kecocokan untuk “${query}”.` : "Mulai dari salah satu fixture di bawah atau coba pemindaian langsung."}
            </p>
          </div>

          {/* Banner Demo Pemindaian Atap */}
          <div className={s.bannerDemo}>
            <div className={s.bannerDemoTeks}>
              <span className={s.bannerDemoJudul}>Demo Pemindaian Atap</span>
              <span className={s.bannerDemoSub}>Pipeline CV segmentasi atap & modul</span>
            </div>
            <button
              className={s.tombolPindaiDemo}
              type="button"
              onClick={() => setIdModalPindai(991016391)}
              title="Buka instrumen pemindaian atap"
            >
              <Scan size={14} aria-hidden="true" />
              <span>Mulai Demo</span>
            </button>
          </div>

          {hasil.length ? (
            <ul className={s.daftarBangunan} aria-label="Bangunan yang bisa dipilih">
              {hasil.map((item) => (
                <li key={item.id}>
                  <div style={{ padding: "var(--sp-3)", border: "1px solid var(--line)", borderRadius: "var(--r-s)", background: "var(--surface-2)" }}>
                    <RingkasanBangunan item={item} onBukaPindai={(id) => setIdModalPindai(id)} />
                  </div>
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

      {/* Modal Pemindai Atap */}
      {idModalPindai !== null ? (
        <PemindaiAtap bangunanAwalId={idModalPindai} mode="modal" onTutup={() => setIdModalPindai(null)} />
      ) : null}
    </main>
  );
}
