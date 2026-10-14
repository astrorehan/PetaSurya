"use client";

import { useId, useState, type KeyboardEvent } from "react";
import { ArrowUpRight, Check, Crosshair, MapPin, Sun } from "lucide-react";
import { kwh, kwp, m2, rupiah, tahun, ucapan } from "@petasurya/ui";
import Link from "next/link";
import s from "./halamanBrand.module.css";

type Babak = "atap" | "energi" | "biaya";
const BABAK: { id: Babak; label: string }[] = [
  { id: "atap", label: "Atap" },
  { id: "energi", label: "Energi" },
  { id: "biaya", label: "Biaya" },
];
const BULAN = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];
const pathRing = (ring: number[][]) => `M${ring.map((p) => p.join(",")).join(" L")}Z`;

export function DemoPotensi({
  nama, luas, kapasitas, energi, hemat, biaya, payback, bulanan, footprint, mask, lebar, tinggi,
}: {
  nama: string;
  luas: number;
  kapasitas: number;
  energi: number;
  hemat: number;
  biaya: number;
  payback: number | null;
  bulanan: number[];
  footprint: number[][];
  mask: number[][][][];
  lebar: number;
  tinggi: number;
}) {
  const [babak, setBabak] = useState<Babak>("atap");
  const id = useId().replace(/:/g, "");
  const titik = [...footprint, ...mask.flat(2)];
  const x = titik.map((p) => p[0]);
  const y = titik.map((p) => p[1]);
  const kiri = Math.min(...x) - 48;
  const atas = Math.min(...y) - 48;
  const lebarTinjauan = Math.max(...x) - kiri + 48;
  const tinggiTinjauan = Math.max(...y) - atas + 48;
  const tertinggi = Math.max(...bulanan);
  const nilai = babak === "atap" ? m2(luas) : babak === "energi" ? kwh(energi) : rupiah(hemat, true);
  const label = babak === "atap" ? "Luas atap terbaca" : babak === "energi" ? "Potensi produksi per tahun" : "Estimasi hemat per tahun";
  const keterangan = babak === "atap"
    ? "Kontur hasil segmentasi. Kondisi atap perlu ditinjau di lapangan."
    : babak === "energi"
      ? `Potensi berbasis luas ${kwp(kapasitas)}. Kapasitas pasang belum ditentukan.`
      : `Skenario seluruh luas layak. Biaya awal ${rupiah(biaya, true)}.`;

  function pindahTab(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    let berikut = index;
    if (event.key === "ArrowRight") berikut = (index + 1) % BABAK.length;
    else if (event.key === "ArrowLeft") berikut = (index + BABAK.length - 1) % BABAK.length;
    else if (event.key === "Home") berikut = 0;
    else if (event.key === "End") berikut = BABAK.length - 1;
    else return;
    event.preventDefault();
    setBabak(BABAK[berikut].id);
    event.currentTarget.parentElement?.querySelectorAll("button")[berikut]?.focus();
  }

  return (
    <div className={s.demo}>
      <div className={s.demoBar}>
        <span className={s.demoLokasi}><MapPin size={14} aria-hidden="true" /> {nama}</span>
        <span className={s.demoTag}>CONTOH BENGKULU</span>
      </div>
      <div className={s.demoIsi}>
        <div className={s.kanvasDemo}>
          <div className={s.kanvasLabel}><Crosshair size={13} aria-hidden="true" /> BATAS &amp; LUAS ATAP</div>
          <svg className={s.diagramAtap} viewBox={`${kiri} ${atas} ${lebarTinjauan} ${tinggiTinjauan}`} role="img" aria-label={`Kontur atap ${nama}, luas terbaca ${ucapan(m2(luas))}. Tanpa citra satelit.`}>
            <defs>
              <pattern id={`grid-${id}`} width="32" height="32" patternUnits="userSpaceOnUse">
                <path className={s.garisGrid} d="M32 0H0V32" fill="none" />
              </pattern>
              <pattern id={`sel-${id}`} width="14" height="14" patternUnits="userSpaceOnUse" patternTransform="rotate(-18)">
                <path className={s.garisSel} d="M14 0H0V14" fill="none" />
              </pattern>
            </defs>
            <rect width={lebar} height={tinggi} fill={`url(#grid-${id})`} />
            <path className={s.jejakOsm} d={pathRing(footprint)} />
            {mask.map((poly, i) => <path key={i} className={s.maskAtap} d={poly.map(pathRing).join(" ")} fillRule="evenodd" />)}
            {mask.map((poly, i) => <path key={i} d={poly.map(pathRing).join(" ")} fill={`url(#sel-${id})`} fillRule="evenodd" />)}
            <path className={s.sumbuDiagram} d={`M${lebar / 2} 20V${tinggi - 20}M20 ${tinggi / 2}H${lebar - 20}`} />
          </svg>
          <span className={s.utara} aria-label="Utara">↑<span>U</span></span>
          <div className={s.kanvasBawah}><span><i aria-hidden="true" /> Kontur model</span><span className={s.legendaOsm}><i aria-hidden="true" /> Jejak OSM</span></div>
        </div>
        <div className={s.panelDemo}>
          <div className={s.tabDemo} role="tablist" aria-label="Jelajahi contoh analisis">
            {BABAK.map(({ id: tahap, label: teks }, i) => (
              <button key={tahap} id={`tab-${tahap}-${id}`} role="tab" aria-selected={babak === tahap} aria-controls={`panel-${id}`} tabIndex={babak === tahap ? 0 : -1} onClick={() => setBabak(tahap)} onKeyDown={(e) => pindahTab(e, i)}>{teks}</button>
            ))}
          </div>
          <div id={`panel-${id}`} role="tabpanel" aria-labelledby={`tab-${babak}-${id}`} tabIndex={0} className={s.hasilDemo}>
            <p className={s.labelHasil}>{label}</p>
            <p className={s.angkaHasil} aria-label={ucapan(nilai)}>{nilai}</p>
            <p className={s.keteranganHasil}>{keterangan}</p>
            {babak === "energi" ? (
              <div className={s.grafikDemo}>
                <span className={s.labelGrafik}>PRODUKSI BULANAN · kWh</span>
                <svg viewBox="0 0 288 100" role="img" aria-label={`Produksi bulanan: ${bulanan.map((n, i) => `${BULAN[i]} ${ucapan(kwh(n))}`).join(", ")}`}>
                  {bulanan.map((n, i) => <rect key={i} x={i * 24 + 2} y={96 - n / tertinggi * 80} width="15" height={n / tertinggi * 80} rx="2"><title>{BULAN[i]}: {kwh(n)}</title></rect>)}
                </svg>
                <div className={s.bulanGrafik}><span>JAN</span><span>DES</span></div>
              </div>
            ) : (
              <div className={s.detailHasil}>
                {babak === "atap" ? <><Sun size={17} aria-hidden="true" /><div><span>Potensi berbasis luas</span><strong aria-label={ucapan(kwp(kapasitas))}>{kwp(kapasitas)}</strong></div></>
                  : <><Check size={17} aria-hidden="true" /><div><span>Balik modal dalam skenario ini</span><strong>{payback === null ? "Lebih dari 25 tahun" : tahun(payback)}</strong></div></>}
              </div>
            )}
          </div>
          <Link className={s.tautanDemo} href="/pindai?id=1146141501">Jelajahi analisis ini <ArrowUpRight size={15} aria-hidden="true" /></Link>
        </div>
      </div>
    </div>
  );
}
