"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { AlertTriangle, ChevronDown, Pause, Play, X } from "lucide-react";
import { Angka, DaftarData, Ikon, Lencana, Segmen, Tombol, kelasTombol, kwh, kwp, m2, persen, rupiah } from "@petasurya/ui";
import s from "./pemindaiAtap.module.css";

import {
  type BangunanTargetPindai,
  type TileCitra,
  DAFTAR_BANGUNAN,
  TAHAP_INFO,
} from "./pemindaiData";

export type { BangunanTargetPindai, TileCitra };
export { DAFTAR_BANGUNAN, TAHAP_INFO };

const TAHAP_RINGKAS = ["Citra", "Atap", "Halangan", "Arah", "Panel"];

const KUERI_SEMPIT = "(max-width: 560px)";
const langgananSempit = (ubah: () => void) => {
  const mq = window.matchMedia(KUERI_SEMPIT);
  mq.addEventListener("change", ubah);
  return () => mq.removeEventListener("change", ubah);
};
const cekSempit = () => window.matchMedia(KUERI_SEMPIT).matches;

type PemindaiAtapProps = {
  bangunanAwalId?: number;
  mode?: "halaman" | "modal" | "tertanam";
  onTutup?: () => void;
};

export function PemindaiAtap({ bangunanAwalId, mode = "halaman", onTutup }: PemindaiAtapProps) {
  const [indeksBangunan, setIndeksBangunan] = useState(() => {
    if (!bangunanAwalId) return 0;
    const idx = DAFTAR_BANGUNAN.findIndex((b) => b.id === bangunanAwalId);
    return idx >= 0 ? idx : 0;
  });

  const [tahap, setTahap] = useState(1);
  const [sedangMemindai, setSedangMemindai] = useState(false);
  const [kecepatan, setKecepatan] = useState<1 | 2>(1);
  const [tipeModul, setTipeModul] = useState<550 | 440>(550);

  // Sakelar lapisan visual
  const [tampilSatelit, setTampilSatelit] = useState(true);
  const [tampilKontur, setTampilKontur] = useState(true);
  const [tampilObstruksi, setTampilObstruksi] = useState(true);
  const [tampilBubungan, setTampilBubungan] = useState(true);
  const [tampilModul, setTampilModul] = useState(true);
  const [tampilKompas, setTampilKompas] = useState(true);

  // Status interaktif hover inspeksi
  const [obstruksiSorot, setObstruksiSorot] = useState<string | null>(null);
  const [modulSorot, setModulSorot] = useState<number | null>(null);

  // Animasi posisi laser scanline
  const [scanlineY, setScanlineY] = useState(120);

  const wadahRef = useRef<HTMLDivElement>(null);
  const Judul = mode === "halaman" ? "h1" : "h2";

  // Layar sempit: pangkas kanvas 2× di sekitar pusat. Semua bbox fixture berada di 160–480 × 120–360.
  const sempit = useSyncExternalStore(langgananSempit, cekSempit, () => false);
  const viewBox = sempit ? "160 120 320 240" : "0 0 640 480";
  const posisiKompas = sempit ? "translate(444, 156)" : "translate(596, 44)";

  const bangunan = DAFTAR_BANGUNAN[indeksBangunan];
  const tahapAktif = TAHAP_INFO[tahap - 1];
  const spekAktif = bangunan.specs[tipeModul];
  const modulAktif = tipeModul === 550 ? bangunan.pv_modules_550 : bangunan.pv_modules_440;

  // Sinkronisasi URL query param saat ganti bangunan di mode halaman
  useEffect(() => {
    if (mode === "halaman" && typeof window !== "undefined") {
      const url = new URL(window.location.href);
      url.searchParams.set("id", String(bangunan.id));
      window.history.replaceState(null, "", url.toString());
    }
  }, [bangunan.id, mode]);

  // Efek animasi laser scanline saat pemindaian aktif
  useEffect(() => {
    if (!sedangMemindai || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let arah = 1;
    const batasAtas = 140;
    const batasBawah = 350;

    const interval = setInterval(() => {
      setScanlineY((sebelumnya) => {
        let lanjut = sebelumnya + 4 * arah * kecepatan;
        if (lanjut >= batasBawah) {
          arah = -1;
          lanjut = batasBawah;
        } else if (lanjut <= batasAtas) {
          arah = 1;
          lanjut = batasAtas;
        }
        return lanjut;
      });
    }, 32);

    return () => clearInterval(interval);
  }, [sedangMemindai, kecepatan]);

  // Efek pergantian tahap otomatis saat pemindaian aktif
  useEffect(() => {
    if (!sedangMemindai) return;

    const durasi = kecepatan === 1 ? 2800 : 1500;
    const timer = setTimeout(() => {
      setTahap((sekarang) => {
        if (sekarang < 5) return sekarang + 1;
        setSedangMemindai(false);
        return 5;
      });
    }, durasi);

    return () => clearTimeout(timer);
  }, [sedangMemindai, tahap, kecepatan]);

  // Pintasan hanya berlaku di kanvas; isian dan kontrol mempertahankan perilaku aslinya.
  useEffect(() => {
    const tanganiKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && mode === "modal" && onTutup) {
        e.preventDefault();
        onTutup();
        return;
      }
      const target = e.target;
      if (!(target instanceof HTMLElement || target instanceof SVGElement) || !wadahRef.current?.contains(target)) return;
      if (e.ctrlKey || e.metaKey || e.altKey || target.closest("input, textarea, select, button, a, summary, [contenteditable='true']")) return;

      if (e.key === " ") {
        e.preventDefault();
        if (tahap === 5 && !sedangMemindai) setTahap(1);
        setSedangMemindai((p) => !p);
      } else if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
        e.preventDefault();
        setTahap((t) => Math.max(1, Math.min(5, t + (e.key === "ArrowLeft" ? -1 : 1))));
        setSedangMemindai(false);
      } else if (["1", "2", "3", "4", "5"].includes(e.key)) {
        e.preventDefault();
        setTahap(Number(e.key));
        setSedangMemindai(false);
      } else if (e.key.toLowerCase() === "r") {
        e.preventDefault();
        setTahap(1);
        setSedangMemindai(true);
      }
    };
    window.addEventListener("keydown", tanganiKey);
    return () => window.removeEventListener("keydown", tanganiKey);
  }, [mode, onTutup, tahap, sedangMemindai]);

  useEffect(() => {
    if (mode !== "modal") return;
    const pemicu = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const wadah = wadahRef.current;
    const fokuskan = () => Array.from(wadah?.querySelectorAll<HTMLElement>("button:not([disabled]), a[href], input, select, summary, [tabindex='0']") ?? [])
      .filter((el) => el.getClientRects().length > 0);
    fokuskan()[0]?.focus();
    const jagaFokus = (event: KeyboardEvent) => {
      if (event.key !== "Tab") return;
      const kontrol = fokuskan();
      const pertama = kontrol[0];
      const terakhir = kontrol[kontrol.length - 1];
      if (event.shiftKey && document.activeElement === pertama) {
        event.preventDefault();
        terakhir?.focus();
      } else if (!event.shiftKey && document.activeElement === terakhir) {
        event.preventDefault();
        pertama?.focus();
      }
    };
    wadah?.addEventListener("keydown", jagaFokus);
    const gulirAwal = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      wadah?.removeEventListener("keydown", jagaFokus);
      document.body.style.overflow = gulirAwal;
      pemicu?.focus({ preventScroll: true });
    };
  }, [mode]);

  const mulaiPindaiOtomatis = useCallback(() => {
    if (tahap === 5) setTahap(1);
    setSedangMemindai(true);
  }, [tahap]);

  const jedaPindai = useCallback(() => {
    setSedangMemindai(false);
  }, []);

  const gantiBangunan = (idx: number) => {
    setIndeksBangunan(idx);
    setTahap(1);
    setSedangMemindai(false);
    setObstruksiSorot(null);
    setModulSorot(null);
  };

  const polygonString = useMemo(() => {
    return bangunan.polygon.map(([x, y]) => `${x},${y}`).join(" ");
  }, [bangunan]);

  // Sudut dial kompas dan vektor hadap
  const rotasiJarum = bangunan.azimuth_deg;

  const konten = (
    <div className={s.wadah} ref={wadahRef}>
      <header className={s.kepala}>
        <div className={s.labelBaris}>
          <Judul id="judul-modal-pemindai" className={s.judul}>Pindai atap</Judul>
          <Lencana contoh>Demo</Lencana>
        </div>
        {mode === "modal" && onTutup ? (
          <Tombol ikon={X} hanyaIkon onClick={onTutup}>Tutup pemindai</Tombol>
        ) : null}
      </header>

      <div className={s.srOnly} aria-live="polite">Tahap {tahap} dari 5: {TAHAP_RINGKAS[tahap - 1]}.</div>

      <label className={s.pilihBangunan}>
        Bangunan
        <select value={indeksBangunan} onChange={(event) => gantiBangunan(Number(event.target.value))}>
          {DAFTAR_BANGUNAN.map((item, idx) => <option key={item.id} value={idx}>{item.nama}</option>)}
        </select>
      </label>

      {/* Grid Utama: Layar Sensor + Panel Telemetri */}
      <div className={s.gridPemindai}>
        {/* Kolom Kiri: Kanvas Sensor & Kontrol */}
        <section className={s.kolomKanvas} aria-label="Layar visual pemindai">
          <div className={s.kotakSensor}>
            {/* Canvas Overlay Grafis Vektor */}
            <svg
              className={s.kanvasSvg}
              tabIndex={0}
              viewBox={viewBox}
              role="img"
              aria-label={`Visualisasi pemindaian tahap ${tahap}: ${tahapAktif.nama}`}
            >
              <defs>
                {/* Pola Grid Millimeter Teknis */}
                <pattern id="gridTeknis" width="40" height="40" patternUnits="userSpaceOnUse">
                  <path d="M 40 0 L 0 0 0 40" fill="none" stroke="rgba(174, 183, 199, 0.08)" strokeWidth="0.8" />
                  <circle cx="20" cy="20" r="0.8" fill="rgba(174, 183, 199, 0.12)" />
                </pattern>

                {/* Pola Arsir Merah untuk Area Obstruksi */}
                <pattern id="arsirObstruksi" width="8" height="8" patternTransform="rotate(45)" patternUnits="userSpaceOnUse">
                  <line x1="0" y1="0" x2="0" y2="8" stroke="#B03A1E" strokeWidth="2" opacity="0.75" />
                </pattern>

                {/* Marker Panah Vektor Azimut */}
                <marker id="panahAzimut" markerWidth="8" markerHeight="8" refX="6" refY="4" orient="auto">
                  <path d="M 0 0 L 8 4 L 0 8 Z" fill="#E8920F" />
                </marker>
              </defs>

              {/* Latar Grid Teknis Millimeter */}
              <rect width="640" height="480" fill="url(#gridTeknis)" />

              {/* Citra satelit latar: mosaik multi-tile Esri z=19 (0,298 m/px) */}
              {tampilSatelit ? (
                <g id="satelit-tiles" opacity="0.88">
                  {bangunan.tiles.map((t, ti) => (
                    <image
                      key={ti}
                      href={t.url}
                      x={t.x}
                      y={t.y}
                      width={256}
                      height={256}
                      preserveAspectRatio="none"
                    />
                  ))}
                </g>
              ) : null}

              {/* Reticle Crosshairs Pusat Sensor */}
              <line x1="320" y1="0" x2="320" y2="480" stroke="rgba(174, 183, 199, 0.18)" strokeDasharray="3 4" />
              <line x1="0" y1="240" x2="640" y2="240" stroke="rgba(174, 183, 199, 0.18)" strokeDasharray="3 4" />
              <circle cx="320" cy="240" r="60" fill="none" stroke="rgba(174, 183, 199, 0.22)" strokeDasharray="2 3" />

              {/* TAHAP 1: Bounding Box & Prompt Centroid OSM */}
              {tahap >= 1 ? (
                <g id="tahap-1-bbox" opacity="0.95">
                  <rect
                    x={bangunan.bbox[0]}
                    y={bangunan.bbox[1]}
                    width={bangunan.bbox[2]}
                    height={bangunan.bbox[3]}
                    fill="none"
                    stroke="#AEB7C7"
                    strokeWidth="1.5"
                    strokeDasharray="6 4"
                  />
                  {/* Sudut kurung [ ] pembatas */}
                  <path
                    d={`M ${bangunan.bbox[0] - 8} ${bangunan.bbox[1] + 16} L ${bangunan.bbox[0] - 8} ${
                      bangunan.bbox[1] - 8
                    } L ${bangunan.bbox[0] + 16} ${bangunan.bbox[1] - 8}`}
                    fill="none"
                    stroke="#E8920F"
                    strokeWidth="2.5"
                  />
                  <path
                    d={`M ${bangunan.bbox[0] + bangunan.bbox[2] + 8} ${bangunan.bbox[1] + 16} L ${
                      bangunan.bbox[0] + bangunan.bbox[2] + 8
                    } ${bangunan.bbox[1] - 8} L ${bangunan.bbox[0] + bangunan.bbox[2] - 16} ${bangunan.bbox[1] - 8}`}
                    fill="none"
                    stroke="#E8920F"
                    strokeWidth="2.5"
                  />
                  <path
                    d={`M ${bangunan.bbox[0] - 8} ${bangunan.bbox[1] + bangunan.bbox[3] - 16} L ${
                      bangunan.bbox[0] - 8
                    } ${bangunan.bbox[1] + bangunan.bbox[3] + 8} L ${bangunan.bbox[0] + 16} ${
                      bangunan.bbox[1] + bangunan.bbox[3] + 8
                    }`}
                    fill="none"
                    stroke="#E8920F"
                    strokeWidth="2.5"
                  />
                  <path
                    d={`M ${bangunan.bbox[0] + bangunan.bbox[2] + 8} ${bangunan.bbox[1] + bangunan.bbox[3] - 16} L ${
                      bangunan.bbox[0] + bangunan.bbox[2] + 8
                    } ${bangunan.bbox[1] + bangunan.bbox[3] + 8} L ${
                      bangunan.bbox[0] + bangunan.bbox[2] - 16
                    } ${bangunan.bbox[1] + bangunan.bbox[3] + 8}`}
                    fill="none"
                    stroke="#E8920F"
                    strokeWidth="2.5"
                  />
                  {/* Centroid Prompt Point */}
                  <circle cx="320" cy="240" r="7" fill="#E8920F" opacity="0.9" />
                  <circle cx="320" cy="240" r="15" fill="none" stroke="#E8920F" strokeWidth="1.2" opacity="0.6" />
                  <text
                    x={bangunan.bbox[0]}
                    y={bangunan.bbox[1] - 14}
                    fill="#E4E8F0"
                    stroke="rgba(10, 14, 28, 0.9)"
                    strokeWidth="3"
                    paintOrder="stroke"
                    fontFamily="monospace"
                    fontSize="10"
                    fontWeight="600"
                  >
                    JEJAK BANGUNAN {m2(bangunan.footprint_m2)}
                  </text>
                </g>
              ) : null}

              {/* TAHAP 2: Poligon Kontur Atap Segmentasi AI */}
              {tahap >= 2 && tampilKontur ? (
                <g id="tahap-2-kontur">
                  <polygon
                    points={polygonString}
                    fill="rgba(232, 144, 15, 0.25)"
                    stroke="#E8920F"
                    strokeWidth="2.5"
                    strokeLinejoin="round"
                  />
                  {/* Titik Simpul (Vertices) */}
                  {bangunan.polygon.map(([vx, vy], vi) => (
                    <circle key={vi} cx={vx} cy={vy} r="3.5" fill="#FFFFFF" stroke="#E8920F" strokeWidth="1.5" />
                  ))}
                  {tahap === 2 ? (
                    <text
                      x="320"
                      y="245"
                      fill="#FFFFFF"
                      stroke="rgba(10, 14, 28, 0.9)"
                      strokeWidth="3"
                      paintOrder="stroke"
                      fontFamily="monospace"
                      fontSize="11"
                      fontWeight="600"
                      textAnchor="middle"
                    >
                      LUAS ATAP {m2(bangunan.roof_area_m2)}
                    </text>
                  ) : null}
                </g>
              ) : null}

              {/* TAHAP 3: Obstruksi & Zona Larangan */}
              {tahap >= 3 && tampilObstruksi ? (
                <g id="tahap-3-obstruksi">
                  {bangunan.obstructions.map((obs) => {
                    const disorot = obstruksiSorot === obs.id;
                    return (
                      <g
                        key={obs.id}
                        onMouseEnter={() => setObstruksiSorot(obs.id)}
                        onMouseLeave={() => setObstruksiSorot(null)}
                        style={{ cursor: "pointer" }}
                      >
                        <rect
                          x={obs.x}
                          y={obs.y}
                          width={obs.w}
                          height={obs.h}
                          fill="url(#arsirObstruksi)"
                          stroke={disorot ? "#FFFFFF" : "#EE8460"}
                          strokeWidth={disorot ? "2.5" : "1.8"}
                          rx="2"
                        />
                        {(tahap <= 4 || disorot) ? (
                          <>
                            <rect
                              x={obs.x}
                              y={obs.y - 16}
                              width={obs.label.length * 6 + 8}
                              height="14"
                              fill="rgba(10, 14, 28, 0.9)"
                              rx="2"
                            />
                            <text
                              x={obs.x + 4}
                              y={obs.y - 5}
                              fill={disorot ? "#FFFFFF" : "#EE8460"}
                              fontFamily="monospace"
                              fontSize="10"
                              fontWeight="600"
                            >
                              {obs.label}
                            </text>
                          </>
                        ) : null}
                      </g>
                    );
                  })}
                </g>
              ) : null}

              {/* TAHAP 4: Garis Bubungan (Ridge) & Vektor Azimut / Kemiringan */}
              {tahap >= 4 && tampilBubungan ? (
                <g id="tahap-4-orientasi">
                  {bangunan.ridges.map(([rx1, ry1, rx2, ry2], ri) => (
                    <g key={ri}>
                      <line x1={rx1} y1={ry1} x2={rx2} y2={ry2} stroke="#FFFFFF" strokeWidth="3.5" strokeLinecap="round" />
                      <line
                        x1={rx1}
                        y1={ry1}
                        x2={rx2}
                        y2={ry2}
                        stroke="#E8920F"
                        strokeWidth="1.2"
                        strokeDasharray="4 2"
                      />
                    </g>
                  ))}

                  {/* Vektor Arah Hadap (Azimut) */}
                  <line
                    x1={bangunan.azimuth_vec[0]}
                    y1={bangunan.azimuth_vec[1]}
                    x2={bangunan.azimuth_vec[2]}
                    y2={bangunan.azimuth_vec[3]}
                    stroke="#E8920F"
                    strokeWidth="2.5"
                    markerEnd="url(#panahAzimut)"
                  />
                  <circle cx={bangunan.azimuth_vec[0]} cy={bangunan.azimuth_vec[1]} r="3" fill="#E8920F" />
                  {tahap === 4 ? (
                    <text
                      x={bangunan.azimuth_vec[2] + 6}
                      y={bangunan.azimuth_vec[3]}
                      fill="#F2A93F"
                      stroke="rgba(10, 14, 28, 0.9)"
                      strokeWidth="3"
                      paintOrder="stroke"
                      fontFamily="monospace"
                      fontSize="10"
                      fontWeight="600"
                    >
                      AZIMUT {bangunan.azimuth_deg}° · MIRING {bangunan.tilt_deg}°
                    </text>
                  ) : null}
                </g>
              ) : null}

              {/* TAHAP 5: Grid Modul Surya PV */}
              {tahap >= 5 && tampilModul ? (
                <g id="tahap-5-pv">
                  {modulAktif.map((mod) => {
                    const disorot = modulSorot === mod.id;
                    return (
                      <g
                        key={mod.id}
                        onMouseEnter={() => setModulSorot(mod.id)}
                        onMouseLeave={() => setModulSorot(null)}
                        style={{ cursor: "pointer" }}
                      >
                        <rect
                          x={mod.x}
                          y={mod.y}
                          width={mod.w}
                          height={mod.h}
                          fill={disorot ? "#2B3A77" : "#17204A"}
                          stroke={disorot ? "#E8920F" : "#AEB7C7"}
                          strokeWidth={disorot ? "1.5" : "0.8"}
                          rx="1"
                        />
                        <line
                          x1={mod.x + 2}
                          y1={mod.y + 1}
                          x2={mod.x + 2}
                          y2={mod.y + mod.h - 1}
                          stroke="#AEB7C7"
                          strokeWidth="0.4"
                          opacity="0.6"
                        />
                        <line
                          x1={mod.x + mod.w - 2}
                          y1={mod.y + 1}
                          x2={mod.x + mod.w - 2}
                          y2={mod.y + mod.h - 1}
                          stroke="#AEB7C7"
                          strokeWidth="0.4"
                          opacity="0.6"
                        />
                      </g>
                    );
                  })}
                </g>
              ) : null}

              {/* Mini Dial Kompas Surya di Sudut Kanan Bawah */}
              {tampilKompas && (tahap >= 4 || tahap === 5) ? (
                <g id="dial-kompas" transform={posisiKompas}>
                  <circle cx="0" cy="0" r="32" fill="rgba(10, 14, 28, 0.88)" stroke="rgba(174, 183, 199, 0.3)" strokeWidth="1" />
                  <text x="0" y="-20" fill="#E8920F" fontFamily="monospace" fontSize="8" fontWeight="bold" textAnchor="middle">
                    U
                  </text>
                  <text x="22" y="3" fill="#AEB7C7" fontFamily="monospace" fontSize="7" textAnchor="middle">
                    T
                  </text>
                  <text x="0" y="24" fill="#AEB7C7" fontFamily="monospace" fontSize="7" textAnchor="middle">
                    S
                  </text>
                  <text x="-22" y="3" fill="#AEB7C7" fontFamily="monospace" fontSize="7" textAnchor="middle">
                    B
                  </text>
                  {/* Jarum Hadap Atap */}
                  <g transform={`rotate(${rotasiJarum})`}>
                    <line x1="0" y1="0" x2="0" y2="-22" stroke="#E8920F" strokeWidth="2" markerEnd="url(#panahAzimut)" />
                    <circle cx="0" cy="0" r="2.5" fill="#E8920F" />
                  </g>
                  <text x="0" y="38" fill="#AEB7C7" fontFamily="monospace" fontSize="8" textAnchor="middle">
                    {bangunan.azimuth_deg}°
                  </text>
                </g>
              ) : null}

              {/* Garis Pemindai Laser Optik (Scanline) */}
              {sedangMemindai ? (
                <g id="laser-scanline">
                  <line x1="60" y1={scanlineY} x2="580" y2={scanlineY} stroke="#E8920F" strokeWidth="2.5" />
                  <line
                    x1="60"
                    y1={scanlineY}
                    x2="580"
                    y2={scanlineY}
                    stroke="#FFFFFF"
                    strokeWidth="1"
                    strokeDasharray="4 2"
                  />
                  <rect
                    x="60"
                    y={scanlineY - 20}
                    width="520"
                    height="20"
                    fill="rgba(232, 144, 15, 0.12)"
                    pointerEvents="none"
                  />
                </g>
              ) : null}
            </svg>

            {/* Tooltip Dinamis saat Hover Elemen Obstruksi / Modul */}
            {obstruksiSorot ? (
              <div className={s.tooltipKanvas}>
                <span>OBSTRUKSI: {bangunan.obstructions.find((o) => o.id === obstruksiSorot)?.keterangan}</span>
              </div>
            ) : modulSorot ? (
              <div className={s.tooltipKanvas}>
                <span>
                  MODUL #{modulSorot}: Mono-Si {tipeModul} Wp · String #{modulAktif.find((m) => m.id === modulSorot)?.string_id}
                </span>
              </div>
            ) : null}

            <div className={s.hudBawah}>
              <span>© Esri World Imagery</span>
              <span>Data contoh</span>
            </div>
          </div>

          <div className={s.kontrolBar}>
            <div className={s.barisAksi}>
              <Tombol varian="primer" ikon={sedangMemindai ? Pause : Play} onClick={sedangMemindai ? jedaPindai : mulaiPindaiOtomatis}>
                {sedangMemindai ? "Jeda" : tahap === 5 ? "Putar ulang" : "Putar demo"}
              </Tombol>
              <span className={s.progres}>Tahap {tahap} / 5</span>
            </div>

            <div className={s.stepper} role="group" aria-label="Tahap pemindaian">
              {TAHAP_INFO.map((step) => (
                <button
                  key={step.nomor}
                  className={`${s.tombolTahap} ${step.nomor === tahap ? s.tahapAktif : ""}`}
                  type="button"
                  aria-pressed={step.nomor === tahap}
                  onClick={() => { setTahap(step.nomor); setSedangMemindai(false); }}
                >
                  <span className={s.tahapNomor} aria-hidden="true">0{step.nomor}</span>
                  <span className={s.tahapNama}>{TAHAP_RINGKAS[step.nomor - 1]}</span>
                </button>
              ))}
            </div>

            <details className={s.rincian}>
              <summary>Tampilan & pemutaran <Ikon ikon={ChevronDown} /></summary>
              <div className={s.barisLapisan}>
                {[
                  { label: "Satelit", nilai: tampilSatelit, ubah: setTampilSatelit },
                  { label: "Kontur", nilai: tampilKontur, ubah: setTampilKontur },
                  { label: "Penghalang", nilai: tampilObstruksi, ubah: setTampilObstruksi },
                  { label: "Bubungan", nilai: tampilBubungan, ubah: setTampilBubungan },
                  { label: "Panel", nilai: tampilModul, ubah: setTampilModul },
                  { label: "Kompas", nilai: tampilKompas, ubah: setTampilKompas },
                ].map((lapisan) => (
                  <label key={lapisan.label} className={s.itemLapisan}>
                    <input type="checkbox" checked={lapisan.nilai} onChange={(event) => lapisan.ubah(event.target.checked)} />
                    {lapisan.label}
                  </label>
                ))}
              </div>
              <Segmen
                nama="kecepatan-demo"
                label="Kecepatan"
                nilai={String(kecepatan)}
                onUbah={(nilai) => setKecepatan(Number(nilai) as 1 | 2)}
                pilihan={[{ nilai: "1", label: "1×" }, { nilai: "2", label: "2×" }]}
              />
              <p className={s.bantuan}>Saat kanvas mendapat fokus: Spasi untuk putar/jeda, panah untuk pindah tahap, R untuk ulang.</p>
            </details>
          </div>
        </section>

        <aside className={s.panelTelemetri} aria-label="Hasil simulasi panel">
          {bangunan.method === "footprint_fallback" ? (
            <div className={s.kotakPeringatan} role="alert">
              <Ikon ikon={AlertTriangle} />
              <span>Keyakinan rendah. Luas atap memakai perkiraan jejak bangunan.</span>
            </div>
          ) : null}

          <Angka
            label="Kapasitas contoh"
            nilai={kwp(spekAktif.kwp)}
            ukuran="display"
            aksen="surya"
            keterangan={`${spekAktif.count} panel · ${m2(bangunan.usable_area_m2)} area pemasangan`}
          />

          <Segmen
            label="Daya per panel"
            nama="daya-panel-demo"
            nilai={String(tipeModul)}
            onUbah={(nilai) => setTipeModul(Number(nilai) as 550 | 440)}
            pilihan={[{ nilai: "550", label: "550 Wp" }, { nilai: "440", label: "440 Wp" }]}
          />

          <Link className={kelasTombol()} href={`/atap/${bangunan.id}`} onClick={onTutup}>Lihat hasil bangunan</Link>

          <details className={s.rincian}>
            <summary>Rincian simulasi <Ikon ikon={ChevronDown} /></summary>
            <DaftarData baris={[
              { label: "Produksi tahun pertama", nilai: kwh(spekAktif.e_ac_kwh_yr1) },
              { label: "Hemat tahun pertama", nilai: rupiah(spekAktif.savings_idr_yr1) },
              { label: "Luas bangunan", nilai: m2(bangunan.footprint_m2) },
              { label: "Luas atap", nilai: m2(bangunan.roof_area_m2) },
              { label: "Penghalang", nilai: persen(bangunan.obstruction_frac) },
              { label: "Kemiringan", nilai: bangunan.tilt_deg.toLocaleString("id-ID") + "°" },
              { label: "Arah atap", nilai: bangunan.arah_label },
            ]} />
          </details>

          <details className={s.rincian}>
            <summary>Tentang tahap ini <Ikon ikon={ChevronDown} /></summary>
            <h2 className={s.kartuInfoJudul}>{tahapAktif.subjudul}</h2>
            <p className={s.penjelasanTahap}>{tahapAktif.penjelasan}</p>
            <p className={s.bantuan}>Demo memutar data contoh; analisis citra tidak dijalankan langsung.</p>
          </details>

          <details className={s.rincian}>
            <summary>Data teknis <Ikon ikon={ChevronDown} /></summary>
            <DaftarData baris={[
              { label: "Keyakinan analisis", nilai: persen(bangunan.confidence) },
              { label: "Metode", nilai: bangunan.method === "cv" ? "Analisis citra" : "Jejak bangunan" },
              { label: "Model", nilai: bangunan.model_version },
              { label: "Koordinat", nilai: bangunan.koordinat.map((n) => n.toLocaleString("id-ID", { maximumFractionDigits: 5 })).join("; ") },
            ]} />
          </details>

          <details className={s.rincian}>
            <summary>Log demo <Ikon ikon={ChevronDown} /></summary>
            <div className={s.terminalIsi} role="log" aria-label="Catatan tahap demo">
              {bangunan.cv_logs.filter((log) => log.tahap <= tahap).map((log, li) => (
                <div key={li} className={s.terminalBaris}>
                  <span className={s.terminalWaktu}>[{log.waktu}]</span>
                  <span className={s.terminalTeks}>{log.pesan}</span>
                </div>
              ))}
            </div>
          </details>
        </aside>
      </div>
    </div>
  );

  if (mode === "modal") {
    return (
      <div
        className={s.wadahModal}
        role="dialog"
        aria-modal="true"
        aria-labelledby="judul-modal-pemindai"
        onClick={(e) => {
          if (e.target === e.currentTarget && onTutup) {
            onTutup();
          }
        }}
      >
        <div className={s.kartuModal}>{konten}</div>
      </div>
    );
  }

  return mode === "halaman" ? <main>{konten}</main> : konten;
}
