"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Compass,
  Cpu,
  Crosshair,
  ExternalLink,
  Layers,
  Pause,
  Play,
  RotateCcw,
  Terminal,
  X,
} from "lucide-react";
import { kwh, kwp, m2, persen, rupiah } from "@petasurya/ui";
import s from "./pemindaiAtap.module.css";

import {
  type BangunanTargetPindai,
  type TileCitra,
  DAFTAR_BANGUNAN,
  TAHAP_INFO,
} from "./pemindaiData";

export type { BangunanTargetPindai, TileCitra };
export { DAFTAR_BANGUNAN, TAHAP_INFO };

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

  // Terminal log status
  const [tampilTerminal, setTampilTerminal] = useState(true);

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
    if (!sedangMemindai) return;

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

  // Kontrol keyboard pintasan
  useEffect(() => {
    const tanganiKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      if (e.key === "Escape" && mode === "modal" && onTutup) {
        e.preventDefault();
        onTutup();
      } else if (e.key === " ") {
        e.preventDefault();
        setSedangMemindai((p) => !p);
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        setTahap((t) => Math.max(1, t - 1));
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        setTahap((t) => Math.min(5, t + 1));
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
  }, [mode, onTutup]);

  const mulaiPindaiOtomatis = useCallback(() => {
    if (tahap === 5) setTahap(1);
    setSedangMemindai(true);
  }, [tahap]);

  const jedaPindai = useCallback(() => {
    setSedangMemindai(false);
  }, []);

  const ulangPindai = useCallback(() => {
    setTahap(1);
    setSedangMemindai(true);
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
    <div className={s.wadah}>
      {/* Header Instrumen */}
      <header className={s.kepala}>
        <div>
          <div className={s.labelBaris}>
            <span className={s.label}>INSTRUMEN CV · L2 COMPUTER VISION</span>
            <span
              className={`${s.lencanaStatus} ${
                bangunan.method === "cv" ? (tahap === 5 ? s.statusSelesai : s.statusAktif) : s.statusFallback
              }`}
            >
              {bangunan.method === "cv" ? (tahap === 5 ? "SELESAI (5/5)" : `TAHAP ${tahap}/5`) : "FALLBACK OSM"}
            </span>
          </div>
          <h1 id="judul-modal-pemindai" className={s.judul}>
            Pemindaian & Segmentasi Atap
          </h1>
          <p className={s.pengantar}>
            Demonstrasi pipeline inferensi visual atap: georeferensi citra satelit Esri z=19, deteksi kontur AI MobileSAM, penapisan obstruksi fisik,
            ekstraksi sumbu bubungan & azimut, hingga simulasi susunan modul fotovoltaik.
          </p>
        </div>

        {mode === "modal" && onTutup ? (
          <button className={s.tombolTutup} type="button" onClick={onTutup} aria-label="Tutup pemindai (Esc)">
            <X size={18} aria-hidden="true" />
          </button>
        ) : null}
      </header>

      {/* Pengumuman Aksesibilitas Screen Reader */}
      <div className="srOnly" aria-live="polite">
        Tahap {tahap} dari 5: {tahapAktif.nama}. {tahapAktif.subjudul}
      </div>

      {/* Baris Pemilih Bangunan Target */}
      <nav className={s.barisPreset} aria-label="Pilih target bangunan untuk dipindai">
        {DAFTAR_BANGUNAN.map((item, idx) => {
          const aktif = idx === indeksBangunan;
          return (
            <button
              key={item.id}
              className={`${s.tombolPreset} ${aktif ? s.presetAktif : ""}`}
              type="button"
              onClick={() => gantiBangunan(idx)}
              aria-pressed={aktif}
            >
              <Crosshair size={14} aria-hidden="true" />
              <span>{item.nama}</span>
              <span className={s.presetTag}>{item.kategori.split("/")[0]}</span>
            </button>
          );
        })}
      </nav>

      {/* Grid Utama: Layar Sensor + Panel Telemetri */}
      <div className={s.gridPemindai}>
        {/* Kolom Kiri: Kanvas Sensor & Kontrol */}
        <section className={s.kolomKanvas} aria-label="Layar visual pemindai">
          <div className={s.kotakSensor}>
            {/* Canvas Overlay Grafis Vektor */}
            <svg
              className={s.kanvasSvg}
              viewBox="0 0 640 480"
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

              {/* Citra Satelit Latar: Seamless Multi-tile Esri z=19 (0,298 m/px) */}
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
                    fill="#AEB7C7"
                    fontFamily="monospace"
                    fontSize="10"
                    fontWeight="600"
                  >
                    OSM BBOX: {m2(bangunan.footprint_m2)} · WAY/{bangunan.id}
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
                    <g key={vi}>
                      <circle cx={vx} cy={vy} r="3.5" fill="#FFFFFF" stroke="#E8920F" strokeWidth="1.5" />
                      <text x={vx + 6} y={vy - 4} fill="#AEB7C7" fontFamily="monospace" fontSize="8">
                        v{vi}
                      </text>
                    </g>
                  ))}
                  <text
                    x="320"
                    y="245"
                    fill="#FFFFFF"
                    fontFamily="monospace"
                    fontSize="11"
                    fontWeight="600"
                    textAnchor="middle"
                  >
                    LUAS ATAP: {m2(bangunan.roof_area_m2)}
                  </text>
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
                        <rect
                          x={obs.x}
                          y={obs.y - 14}
                          width={obs.label.length * 6 + 10}
                          height="12"
                          fill="rgba(10, 14, 28, 0.9)"
                          rx="2"
                        />
                        <text
                          x={obs.x + 3}
                          y={obs.y - 4}
                          fill={disorot ? "#FFFFFF" : "#EE8460"}
                          fontFamily="monospace"
                          fontSize="8"
                          fontWeight="600"
                        >
                          {obs.label}
                        </text>
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
                  <text
                    x={bangunan.azimuth_vec[2] + 6}
                    y={bangunan.azimuth_vec[3]}
                    fill="#F2A93F"
                    fontFamily="monospace"
                    fontSize="10"
                    fontWeight="600"
                  >
                    AZIMUT {bangunan.azimuth_deg}° · TILT {bangunan.tilt_deg}°
                  </text>
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
                <g id="dial-kompas" transform="translate(580, 420)">
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

            {/* HUD Telemetri Atas */}
            <div className={s.hudAtas}>
              <span>
                POS: [{bangunan.koordinat[0].toFixed(5)}, {bangunan.koordinat[1].toFixed(5)}]
              </span>
              <span>RESOLUSI: 0,298 M/PX · Z=19</span>
              <span>MODEL: {bangunan.model_version}</span>
            </div>

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

            {/* HUD Telemetri Bawah */}
            <div className={s.hudBawah}>
              <span>CITRA: ESRI WORLD IMAGERY</span>
              <span>
                STATUS: {sedangMemindai ? "MEMINDAI..." : `TAHAP ${tahap}/5 · ${tahapAktif.nama.toUpperCase()}`}
              </span>
              <span>SKOR IoU: {bangunan.confidence.toFixed(2)}</span>
            </div>
          </div>

          {/* Bar Kontrol Pemutar & Stepper */}
          <div className={s.kontrolBar}>
            <div className={s.barisAksi}>
              <div className={s.grupPutar}>
                {sedangMemindai ? (
                  <button className={`${s.tombolKontrol} ${s.tombolPrimer}`} type="button" onClick={jedaPindai} title="Jeda pemindaian (Spasi)">
                    <Pause size={15} aria-hidden="true" />
                    <span>Jeda</span>
                  </button>
                ) : (
                  <button className={`${s.tombolKontrol} ${s.tombolPrimer}`} type="button" onClick={mulaiPindaiOtomatis} title="Mulai pemindaian otomatis (Spasi)">
                    <Play size={15} aria-hidden="true" />
                    <span>{tahap === 5 ? "Pindai Ulang" : "Mulai Pemindaian"}</span>
                  </button>
                )}

                <button className={s.tombolKontrol} type="button" onClick={ulangPindai} title="Ulangi dari tahap 1 (R)">
                  <RotateCcw size={14} aria-hidden="true" />
                  <span>Reset</span>
                </button>

                <button
                  className={s.tombolKontrol}
                  type="button"
                  disabled={tahap <= 1}
                  onClick={() => setTahap((t) => Math.max(1, t - 1))}
                  aria-label="Tahap sebelumnya (←)"
                  title="Tahap sebelumnya (←)"
                >
                  <ChevronLeft size={15} aria-hidden="true" />
                </button>

                <button
                  className={s.tombolKontrol}
                  type="button"
                  disabled={tahap >= 5}
                  onClick={() => setTahap((t) => Math.min(5, t + 1))}
                  aria-label="Tahap selanjutnya (→)"
                  title="Tahap selanjutnya (→)"
                >
                  <ChevronRight size={15} aria-hidden="true" />
                </button>
              </div>

              <div className={s.grupPutar}>
                <span className={s.presetTag}>Kecepatan:</span>
                <button
                  className={`${s.tombolKontrol} ${kecepatan === 1 ? s.presetAktif : ""}`}
                  type="button"
                  onClick={() => setKecepatan(1)}
                >
                  1×
                </button>
                <button
                  className={`${s.tombolKontrol} ${kecepatan === 2 ? s.presetAktif : ""}`}
                  type="button"
                  onClick={() => setKecepatan(2)}
                >
                  2×
                </button>
              </div>
            </div>

            {/* Stepper 5 Tahap */}
            <div className={s.stepper} role="tablist" aria-label="Langkah-langkah pipeline pemindaian atap">
              {TAHAP_INFO.map((step) => {
                const aktif = step.nomor === tahap;
                const lolos = step.nomor < tahap;
                return (
                  <button
                    key={step.nomor}
                    className={`${s.tombolTahap} ${aktif ? s.tahapAktif : ""} ${lolos ? s.tahapLolos : ""}`}
                    type="button"
                    role="tab"
                    aria-selected={aktif}
                    aria-controls="panel-telemetri-pemindai"
                    onClick={() => {
                      setTahap(step.nomor);
                      setSedangMemindai(false);
                    }}
                  >
                    <span className={s.tahapNomor}>0{step.nomor}</span>
                    <span className={s.tahapNama}>{step.nama}</span>
                  </button>
                );
              })}
            </div>

            {/* Sakelar Lapisan Tampilan */}
            <div className={s.barisLapisan}>
              <span className={s.labelLapisanJudul}>
                <Layers size={11} aria-hidden="true" style={{ display: "inline", verticalAlign: "middle", marginRight: 4 }} />
                Lapisan:
              </span>
              <label className={s.itemLapisan}>
                <input
                  type="checkbox"
                  checked={tampilSatelit}
                  onChange={(e) => setTampilSatelit(e.target.checked)}
                />
                <span>Satelit</span>
              </label>
              <label className={s.itemLapisan}>
                <input
                  type="checkbox"
                  checked={tampilKontur}
                  onChange={(e) => setTampilKontur(e.target.checked)}
                />
                <span>Kontur</span>
              </label>
              <label className={s.itemLapisan}>
                <input
                  type="checkbox"
                  checked={tampilObstruksi}
                  onChange={(e) => setTampilObstruksi(e.target.checked)}
                />
                <span>Obstruksi</span>
              </label>
              <label className={s.itemLapisan}>
                <input
                  type="checkbox"
                  checked={tampilBubungan}
                  onChange={(e) => setTampilBubungan(e.target.checked)}
                />
                <span>Bubungan</span>
              </label>
              <label className={s.itemLapisan}>
                <input
                  type="checkbox"
                  checked={tampilModul}
                  onChange={(e) => setTampilModul(e.target.checked)}
                />
                <span>Modul PV</span>
              </label>
              <label className={s.itemLapisan}>
                <input
                  type="checkbox"
                  checked={tampilKompas}
                  onChange={(e) => setTampilKompas(e.target.checked)}
                />
                <Compass size={11} aria-hidden="true" style={{ display: "inline", verticalAlign: "middle", marginRight: 4 }} />
                <span>Kompas</span>
              </label>
            </div>
          </div>
        </section>

        {/* Kolom Kanan: Panel Data Telemetri & Aksi */}
        <aside id="panel-telemetri-pemindai" className={s.panelTelemetri} aria-labelledby="judul-telemetri">
          {/* Penjelasan Tahap Aktif */}
          <div className={s.kartuInfo}>
            <div className={s.labelBaris}>
              <p className={s.label}>TAHAP {tahap} DARI 5</p>
              <Cpu size={14} aria-hidden="true" />
            </div>
            <h2 id="judul-telemetri" className={s.kartuInfoJudul}>
              {tahapAktif.subjudul}
            </h2>
            <p className={s.penjelasanTahap}>{tahapAktif.penjelasan}</p>

            {bangunan.peringatan ? (
              <div className={s.kotakPeringatan} role="alert">
                <AlertTriangle size={16} aria-hidden="true" />
                <span>{bangunan.peringatan}</span>
              </div>
            ) : null}
          </div>

          {/* Pengubah Tipe Modul Surya untuk Demonstrasi Interaktif */}
          <div className={s.kotakModulPilihan}>
            <span className={s.modulPilihanLabel}>Spesifikasi Modul PV:</span>
            <div className={s.grupPilihanModul} role="group" aria-label="Pilih daya modul PV">
              <button
                type="button"
                className={`${s.tombolPilihanModul} ${tipeModul === 550 ? s.tombolPilihanModulAktif : ""}`}
                onClick={() => setTipeModul(550)}
              >
                550 Wp Tier-1
              </button>
              <button
                type="button"
                className={`${s.tombolPilihanModul} ${tipeModul === 440 ? s.tombolPilihanModulAktif : ""}`}
                onClick={() => setTipeModul(440)}
              >
                440 Wp Standar
              </button>
            </div>
          </div>

          {/* Grid Metrik Data Geometri & Hasil */}
          <div className={s.gridMetrik} aria-label="Metrik teknis atap terdeteksi">
            <div className={`${s.itemMetrik} ${s.metrikUtama}`}>
              <span className={s.metrikLabel}>Kapasitas Modul PV</span>
              <span className={s.metrikNilai}>
                {kwp(spekAktif.kwp)} · {spekAktif.count} modul
              </span>
            </div>

            <div className={s.itemMetrik}>
              <span className={s.metrikLabel}>Luas Jejak OSM</span>
              <span className={s.metrikNilai}>{m2(bangunan.footprint_m2)}</span>
            </div>

            <div className={s.itemMetrik}>
              <span className={s.metrikLabel}>Luas Atap Tersegmentasi</span>
              <span className={s.metrikNilai}>{m2(bangunan.roof_area_m2)}</span>
            </div>

            <div className={s.itemMetrik}>
              <span className={s.metrikLabel}>Fraksi Obstruksi</span>
              <span className={s.metrikNilai}>{persen(bangunan.obstruction_frac)}</span>
            </div>

            <div className={s.itemMetrik}>
              <span className={s.metrikLabel}>Luas Bersih Siap Pasang</span>
              <span className={s.metrikNilai}>{m2(bangunan.usable_area_m2)}</span>
            </div>

            <div className={s.itemMetrik}>
              <span className={s.metrikLabel}>Sudut Kemiringan (Tilt)</span>
              <span className={s.metrikNilai}>{bangunan.tilt_deg.toFixed(1)}°</span>
            </div>

            <div className={s.itemMetrik}>
              <span className={s.metrikLabel}>Arah Hadap (Azimut)</span>
              <span className={s.metrikNilai}>{bangunan.arah_label}</span>
            </div>

            <div className={s.itemMetrik}>
              <span className={s.metrikLabel}>Estimasi Energi Thn-1</span>
              <span className={s.metrikNilai}>{kwh(spekAktif.e_ac_kwh_yr1)}</span>
            </div>

            <div className={s.itemMetrik}>
              <span className={s.metrikLabel}>Estimasi Hemat Thn-1</span>
              <span className={s.metrikNilai}>{rupiah(spekAktif.savings_idr_yr1)}</span>
            </div>
          </div>

          {/* Terminal Log Inferensi Pipeline CV */}
          <div className={s.terminalLog}>
            <div
              className={s.terminalBar}
              onClick={() => setTampilTerminal((prev) => !prev)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => e.key === "Enter" && setTampilTerminal((prev) => !prev)}
              aria-expanded={tampilTerminal}
              aria-label="Alihkan tampilan terminal log pipeline CV"
            >
              <div className={s.terminalTitle}>
                <div className={s.terminalTitik} />
                <Terminal size={13} aria-hidden="true" />
                <span>TERMINAL LOG INFERENSI CV</span>
              </div>
              {tampilTerminal ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </div>

            {tampilTerminal ? (
              <div className={s.terminalIsi} role="log" aria-live="polite">
                {bangunan.cv_logs
                  .filter((log) => log.tahap <= tahap)
                  .map((log, li) => (
                    <div key={li} className={s.terminalBaris}>
                      <span className={s.terminalWaktu}>[{log.waktu}]</span>
                      <span className={s.terminalTag}>[{log.sub}]</span>
                      <span className={s.terminalTeks}>{log.pesan}</span>
                    </div>
                  ))}
              </div>
            ) : null}
          </div>

          {/* Tombol Tindakan Menuju Laporan Lengkap */}
          <div className={s.aksiLaporan}>
            <Link className={s.tombolBukaLaporan} href={`/atap/${bangunan.id}`}>
              <span>Buka Hasil Perhitungan Lengkap</span>
              <ExternalLink size={15} aria-hidden="true" />
            </Link>
            <p className={s.catatanBawah}>
              Hasil pemindaian dapat diuji langsung dengan kalkulasi tarif, arus kas, dan emisi di L3–L5.
            </p>
          </div>

          {/* Baris Panduan Pintasan Keyboard */}
          <div className={s.barisPintasan} aria-label="Pintasan keyboard navigasi">
            <span className={s.itemPintasan}>
              <kbd className={s.kbd}>Spasi</kbd> Putar/Jeda
            </span>
            <span className={s.itemPintasan}>
              <kbd className={s.kbd}>←</kbd> <kbd className={s.kbd}>→</kbd> Tahap
            </span>
            <span className={s.itemPintasan}>
              <kbd className={s.kbd}>1–5</kbd> Lompat
            </span>
            <span className={s.itemPintasan}>
              <kbd className={s.kbd}>R</kbd> Reset
            </span>
            {mode === "modal" ? (
              <span className={s.itemPintasan}>
                <kbd className={s.kbd}>Esc</kbd> Tutup
              </span>
            ) : null}
          </div>
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

  return konten;
}
