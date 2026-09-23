"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Cpu,
  Crosshair,
  ExternalLink,
  Pause,
  Play,
  RotateCcw,
  X,
} from "lucide-react";
import { kwh, kwp, m2, persen } from "@petasurya/ui";
import s from "./pemindaiAtap.module.css";

export type BangunanTargetPindai = {
  id: number;
  nama: string;
  kategori: string;
  koordinat: [number, number]; // [lat, lon]
  tileUrl: string;
  footprint_m2: number;
  roof_area_m2: number;
  usable_area_m2: number;
  obstruction_frac: number;
  tilt_deg: number;
  azimuth_deg: number;
  arah_label: string;
  roof_type: string;
  confidence: number;
  method: "cv" | "footprint_fallback";
  model_version: string;
  modules_count: number;
  kwp: number;
  e_ac_kwh_yr1: number;
  polygon: [number, number][];
  bbox: [number, number, number, number]; // [x, y, w, h]
  ridge: [number, number, number, number]; // [x1, y1, x2, y2]
  azimuth_vec: [number, number, number, number]; // [x1, y1, x2, y2]
  obstructions: Array<{
    id: string;
    label: string;
    x: number;
    y: number;
    w: number;
    h: number;
    tipe: "tandon" | "ac" | "shaft" | "pohon";
  }>;
  pv_modules: Array<{
    id: number;
    x: number;
    y: number;
    w: number;
    h: number;
  }>;
  peringatan?: string;
};

// Data terkalibrasi presisi untuk 3 bangunan nyata Kota Bengkulu
const DAFTAR_BANGUNAN: BangunanTargetPindai[] = [
  {
    id: 991016391,
    nama: "Toko WR Supratman (Indomaret)",
    kategori: "Komersial / Ruko 2 Lantai",
    koordinat: [-3.76269, 102.27168],
    tileUrl: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/18/133813/205543",
    footprint_m2: 244.6,
    roof_area_m2: 112.4,
    usable_area_m2: 78.7,
    obstruction_frac: 0.19,
    tilt_deg: 22.0,
    azimuth_deg: 285.0,
    arah_label: "Barat-Laut (285°)",
    roof_type: "pelana",
    confidence: 0.81,
    method: "cv",
    model_version: "mobilesam-osmprompt-v3",
    modules_count: 40,
    kwp: 17.6,
    e_ac_kwh_yr1: 24960,
    polygon: [
      [245, 162],
      [450, 245],
      [420, 318],
      [190, 225],
      [208, 180],
      [233, 190],
    ],
    bbox: [180, 150, 280, 180],
    ridge: [217, 202, 435, 281],
    azimuth_vec: [320, 240, 290, 170],
    obstructions: [
      { id: "obs-1", label: "Tandon Air Utama", x: 360, y: 240, w: 26, h: 26, tipe: "tandon" },
      { id: "obs-2", label: "Unit Kompresor AC", x: 260, y: 200, w: 24, h: 18, tipe: "ac" },
    ],
    pv_modules: [
      // Baris 1
      { id: 1, x: 230, y: 175, w: 18, h: 11 },
      { id: 2, x: 252, y: 184, w: 18, h: 11 },
      { id: 3, x: 274, y: 193, w: 18, h: 11 },
      { id: 4, x: 296, y: 202, w: 18, h: 11 },
      { id: 5, x: 318, y: 211, w: 18, h: 11 },
      { id: 6, x: 340, y: 220, w: 18, h: 11 },
      { id: 7, x: 362, y: 229, w: 18, h: 11 },
      { id: 8, x: 384, y: 238, w: 18, h: 11 },
      { id: 9, x: 406, y: 247, w: 18, h: 11 },
      { id: 10, x: 428, y: 256, w: 18, h: 11 },
      // Baris 2
      { id: 11, x: 222, y: 192, w: 18, h: 11 },
      { id: 12, x: 244, y: 201, w: 18, h: 11 },
      { id: 13, x: 288, y: 219, w: 18, h: 11 },
      { id: 14, x: 310, y: 228, w: 18, h: 11 },
      { id: 15, x: 332, y: 237, w: 18, h: 11 },
      { id: 16, x: 398, y: 264, w: 18, h: 11 },
      { id: 17, x: 420, y: 273, w: 18, h: 11 },
      // Baris 3
      { id: 18, x: 214, y: 209, w: 18, h: 11 },
      { id: 19, x: 236, y: 218, w: 18, h: 11 },
      { id: 20, x: 258, y: 227, w: 18, h: 11 },
      { id: 21, x: 280, y: 236, w: 18, h: 11 },
      { id: 22, x: 302, y: 245, w: 18, h: 11 },
      { id: 23, x: 324, y: 254, w: 18, h: 11 },
      { id: 24, x: 390, y: 281, w: 18, h: 11 },
      { id: 25, x: 412, y: 290, w: 18, h: 11 },
      // Baris 4
      { id: 26, x: 206, y: 226, w: 18, h: 11 },
      { id: 27, x: 228, y: 235, w: 18, h: 11 },
      { id: 28, x: 250, y: 244, w: 18, h: 11 },
      { id: 29, x: 272, y: 253, w: 18, h: 11 },
      { id: 30, x: 294, y: 262, w: 18, h: 11 },
      { id: 31, x: 316, y: 271, w: 18, h: 11 },
      { id: 32, x: 338, y: 280, w: 18, h: 11 },
      { id: 33, x: 360, y: 289, w: 18, h: 11 },
      { id: 34, x: 382, y: 298, w: 18, h: 11 },
      { id: 35, x: 404, y: 307, w: 18, h: 11 },
      // Baris 5 pelengkap
      { id: 36, x: 240, y: 165, w: 18, h: 11 },
      { id: 37, x: 262, y: 174, w: 18, h: 11 },
      { id: 38, x: 284, y: 183, w: 18, h: 11 },
      { id: 39, x: 306, y: 192, w: 18, h: 11 },
      { id: 40, x: 328, y: 201, w: 18, h: 11 },
    ],
  },
  {
    id: 1146141501,
    nama: "Fakultas Hukum UNIB",
    kategori: "Kampus / Bangunan Institusi",
    koordinat: [-3.76068, 102.26834],
    tileUrl: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/18/133812/205541",
    footprint_m2: 1505.3,
    roof_area_m2: 1280.0,
    usable_area_m2: 1024.0,
    obstruction_frac: 0.12,
    tilt_deg: 15.0,
    azimuth_deg: 165.0,
    arah_label: "Selatan-Tenggara (165°)",
    roof_type: "pelana (sayap ganda)",
    confidence: 0.88,
    method: "cv",
    model_version: "mobilesam-osmprompt-v3",
    modules_count: 460,
    kwp: 202.4,
    e_ac_kwh_yr1: 284500,
    polygon: [
      [190, 178],
      [244, 348],
      [323, 324],
      [315, 299],
      [450, 256],
      [410, 132],
      [274, 175],
      [267, 151],
      [255, 155],
      [252, 144],
      [215, 155],
      [219, 169],
    ],
    bbox: [175, 120, 290, 240],
    ridge: [230, 250, 420, 195],
    azimuth_vec: [320, 240, 345, 310],
    obstructions: [
      { id: "obs-1", label: "Shaft Tangga & AC", x: 265, y: 220, w: 32, h: 22, tipe: "shaft" },
      { id: "obs-2", label: "Unit Chiller Outdoor", x: 375, y: 210, w: 34, h: 24, tipe: "ac" },
      { id: "obs-3", label: "Naungan Tajuk Pohon", x: 415, y: 250, w: 26, h: 26, tipe: "pohon" },
    ],
    pv_modules: Array.from({ length: 44 }).map((_, i) => {
      const baris = Math.floor(i / 11);
      const kolom = i % 11;
      return {
        id: i + 1,
        x: 210 + kolom * 20 + baris * 5,
        y: 180 + baris * 28 + kolom * 6,
        w: 16,
        h: 12,
      };
    }),
  },
  {
    id: 1145010599,
    nama: "Rumah Kandang Limun",
    kategori: "Residensial / Rumah Warga",
    koordinat: [-3.76166, 102.26732],
    tileUrl: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/18/133813/205540",
    footprint_m2: 277.9,
    roof_area_m2: 277.9,
    usable_area_m2: 236.2,
    obstruction_frac: 0.0,
    tilt_deg: 15.0,
    azimuth_deg: 174.2,
    arah_label: "Selatan (174°)",
    roof_type: "pelana",
    confidence: 0.34,
    method: "footprint_fallback",
    model_version: "footprint-heuristic-v1",
    modules_count: 108,
    kwp: 47.5,
    e_ac_kwh_yr1: 66800,
    polygon: [
      [247, 140],
      [217, 207],
      [287, 237],
      [252, 318],
      [373, 370],
      [423, 255],
      [375, 234],
      [416, 139],
      [348, 110],
      [321, 172],
    ],
    bbox: [205, 100, 230, 280],
    ridge: [270, 160, 380, 310],
    azimuth_vec: [320, 240, 325, 315],
    obstructions: [],
    peringatan:
      "Keyakinan CV rendah (< 0.45). Luas atap diperkirakan dari jejak bangunan OSM dikali 0,85. Silakan gambar ulang batas atap secara manual jika diperlukan.",
    pv_modules: Array.from({ length: 32 }).map((_, i) => {
      const baris = Math.floor(i / 8);
      const kolom = i % 8;
      return {
        id: i + 1,
        x: 250 + kolom * 18 + baris * 8,
        y: 160 + baris * 28 + kolom * 10,
        w: 15,
        h: 11,
      };
    }),
  },
];

const TAHAP_INFO = [
  {
    nomor: 1,
    nama: "Akuisisi Citra",
    subjudul: "Tile Satelit Esri z=19 & Bounding Box OSM",
    penjelasan:
      "Sistem mengambil tile citra satelit resolusi tinggi (~0,298 m/px) dari Esri World Imagery pada koordinat centroid bangunan. Bounding box dan titik prompt diselaraskan dari basis data relasi OpenStreetMap.",
  },
  {
    nomor: 2,
    nama: "Segmentasi AI",
    subjudul: "Deteksi Kontur Atap via MobileSAM (ONNX)",
    penjelasan:
      "Model segmentasi zero-shot MobileSAM memindai citra dengan prompt centroid. Poligon kontur bidang atap dipisahkan secara otomatis dari kanopi pohon, jalan aspal, dan halaman sekitar.",
  },
  {
    nomor: 3,
    nama: "Filter Obstruksi",
    subjudul: "Penapisan Tandon Air, AC & Sempadan Keselamatan",
    penjelasan:
      "Sistem mendeteksi objek penghalang di atas atap (tandon air, kompresor AC outdoor, ventilasi, dan bayangan) serta menerapkan sempadan batas tepi 0,5 meter. Area ini dieksklusi dari bidang penempatan modul.",
  },
  {
    nomor: 4,
    nama: "Bubungan & Hadap",
    subjudul: "Deteksi Garis Ridge, Kemiringan (Tilt) & Azimut",
    penjelasan:
      "Algoritma Principal Component Analysis (PCA) mendeteksi sumbu utama bubungan atap. Vektor hadap azimut dan sudut kemiringan (tilt) dihitung untuk pemodelan transposisi POA pada lintang Bengkulu (-3,8° LS).",
  },
  {
    nomor: 5,
    nama: "Penataan Panel PV",
    subjudul: "Simulasi Grid Modul Surya & Kapasitas kWp",
    penjelasan:
      "Modul fotovoltaik monokristalin Tier-1 disusun secara otomatis pada bidang atap layak yang tersisa. Jumlah modul maksimum, kapasitas total kWp, dan estimasi produksi energi tahun pertama siap dialirkan ke mesin tekno-ekonomi L3–L5.",
  },
];

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

  // Sakelar lapisan visual
  const [tampilSatelit, setTampilSatelit] = useState(true);
  const [tampilKontur, setTampilKontur] = useState(true);
  const [tampilObstruksi, setTampilObstruksi] = useState(true);
  const [tampilBubungan, setTampilBubungan] = useState(true);
  const [tampilModul, setTampilModul] = useState(true);

  // Animasi posisi laser scanline
  const [scanlineY, setScanlineY] = useState(120);

  const bangunan = DAFTAR_BANGUNAN[indeksBangunan];
  const tahapAktif = TAHAP_INFO[tahap - 1];

  // Efek animasi laser scanline saat pemindaian aktif
  useEffect(() => {
    if (!sedangMemindai) return;

    let arah = 1;
    const batasAtas = 130;
    const batasBawah = 360;

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

    const durasi = kecepatan === 1 ? 2600 : 1400;
    const timer = setTimeout(() => {
      setTahap((sekarang) => {
        if (sekarang < 5) return sekarang + 1;
        setSedangMemindai(false);
        return 5;
      });
    }, durasi);

    return () => clearTimeout(timer);
  }, [sedangMemindai, tahap, kecepatan]);

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
  };

  const polygonString = useMemo(() => {
    return bangunan.polygon.map(([x, y]) => `${x},${y}`).join(" ");
  }, [bangunan]);

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
          <h1 className={s.judul}>Pemindaian & Segmentasi Atap</h1>
          <p className={s.pengantar}>
            Demonstrasi pipeline inferensi visual atap: deteksi kontur bangunan dari citra satelit, penapisan obstruksi,
            ekstraksi kemiringan & orientasi, hingga simulasi penataan modul PV surya.
          </p>
        </div>

        {mode === "modal" && onTutup ? (
          <button className={s.tombolTutup} type="button" onClick={onTutup} aria-label="Tutup pemindai">
            <X size={18} aria-hidden="true" />
          </button>
        ) : null}
      </header>

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
            {/* Citra Satelit Latar */}
            {tampilSatelit ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                className={s.citraSatelitLatar}
                src={bangunan.tileUrl}
                alt={`Citra satelit ${bangunan.nama}`}
                loading="eager"
              />
            ) : null}

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

              {/* Latar Grid Teknis */}
              <rect width="640" height="480" fill="url(#gridTeknis)" />

              {/* Reticle Crosshairs Pusat */}
              <line x1="320" y1="0" x2="320" y2="480" stroke="rgba(174, 183, 199, 0.15)" strokeDasharray="3 4" />
              <line x1="0" y1="240" x2="640" y2="240" stroke="rgba(174, 183, 199, 0.15)" strokeDasharray="3 4" />
              <circle cx="320" cy="240" r="60" fill="none" stroke="rgba(174, 183, 199, 0.18)" strokeDasharray="2 3" />

              {/* TAHAP 1: Bounding Box & Prompt Centroid OSM */}
              {tahap >= 1 ? (
                <g id="tahap-1-bbox" opacity="0.95">
                  {/* Bounding box garis putus-putus */}
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
                  <circle cx="320" cy="240" r="7" fill="#E8920F" opacity="0.85" />
                  <circle cx="320" cy="240" r="14" fill="none" stroke="#E8920F" strokeWidth="1.2" opacity="0.5" />
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
                    fill="rgba(232, 144, 15, 0.24)"
                    stroke="#E8920F"
                    strokeWidth="2.5"
                    strokeLinejoin="round"
                  />
                  {/* Titik Simpul (Vertices) */}
                  {bangunan.polygon.map(([vx, vy], vi) => (
                    <g key={vi}>
                      <circle cx={vx} cy={vy} r="4" fill="#FFFFFF" stroke="#E8920F" strokeWidth="1.5" />
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
                  {bangunan.obstructions.map((obs) => (
                    <g key={obs.id}>
                      <rect
                        x={obs.x}
                        y={obs.y}
                        width={obs.w}
                        height={obs.h}
                        fill="url(#arsirObstruksi)"
                        stroke="#EE8460"
                        strokeWidth="1.8"
                        rx="2"
                      />
                      <rect
                        x={obs.x}
                        y={obs.y - 14}
                        width={obs.label.length * 6 + 10}
                        height="12"
                        fill="rgba(10, 14, 28, 0.85)"
                        rx="2"
                      />
                      <text
                        x={obs.x + 3}
                        y={obs.y - 4}
                        fill="#EE8460"
                        fontFamily="monospace"
                        fontSize="8"
                        fontWeight="600"
                      >
                        {obs.label}
                      </text>
                    </g>
                  ))}
                </g>
              ) : null}

              {/* TAHAP 4: Garis Bubungan (Ridge) & Vektor Azimut / Kemiringan */}
              {tahap >= 4 && tampilBubungan ? (
                <g id="tahap-4-orientasi">
                  {/* Garis Bubungan Atap */}
                  <line
                    x1={bangunan.ridge[0]}
                    y1={bangunan.ridge[1]}
                    x2={bangunan.ridge[2]}
                    y2={bangunan.ridge[3]}
                    stroke="#FFFFFF"
                    strokeWidth="3.5"
                    strokeLinecap="round"
                  />
                  <line
                    x1={bangunan.ridge[0]}
                    y1={bangunan.ridge[1]}
                    x2={bangunan.ridge[2]}
                    y2={bangunan.ridge[3]}
                    stroke="#E8920F"
                    strokeWidth="1.2"
                    strokeDasharray="4 2"
                  />

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
                  {bangunan.pv_modules.map((mod) => (
                    <g key={mod.id}>
                      {/* Sel Modul PV (Navy Sel Surya) */}
                      <rect
                        x={mod.x}
                        y={mod.y}
                        width={mod.w}
                        height={mod.h}
                        fill="#17204A"
                        stroke="#AEB7C7"
                        strokeWidth="0.8"
                        rx="1"
                      />
                      {/* Busbar internal perak */}
                      <line
                        x1={mod.x + 3}
                        y1={mod.y + 1}
                        x2={mod.x + 3}
                        y2={mod.y + mod.h - 1}
                        stroke="#AEB7C7"
                        strokeWidth="0.4"
                        opacity="0.6"
                      />
                      <line
                        x1={mod.x + mod.w - 3}
                        y1={mod.y + 1}
                        x2={mod.x + mod.w - 3}
                        y2={mod.y + mod.h - 1}
                        stroke="#AEB7C7"
                        strokeWidth="0.4"
                        opacity="0.6"
                      />
                    </g>
                  ))}
                </g>
              ) : null}

              {/* Garis Pemindai Laser Optik (Scanline) */}
              {sedangMemindai ? (
                <g id="laser-scanline">
                  <line x1="80" y1={scanlineY} x2="560" y2={scanlineY} stroke="#E8920F" strokeWidth="2.5" />
                  <line
                    x1="80"
                    y1={scanlineY}
                    x2="560"
                    y2={scanlineY}
                    stroke="#FFFFFF"
                    strokeWidth="1"
                    strokeDasharray="4 2"
                  />
                  {/* Efek sensor beam gradasi */}
                  <rect
                    x="80"
                    y={scanlineY - 24}
                    width="480"
                    height="24"
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
                  <button className={`${s.tombolKontrol} ${s.tombolPrimer}`} type="button" onClick={jedaPindai}>
                    <Pause size={15} aria-hidden="true" />
                    <span>Jeda</span>
                  </button>
                ) : (
                  <button className={`${s.tombolKontrol} ${s.tombolPrimer}`} type="button" onClick={mulaiPindaiOtomatis}>
                    <Play size={15} aria-hidden="true" />
                    <span>{tahap === 5 ? "Pindai Ulang" : "Mulai Pemindaian"}</span>
                  </button>
                )}

                <button className={s.tombolKontrol} type="button" onClick={ulangPindai} title="Ulangi dari tahap 1">
                  <RotateCcw size={14} aria-hidden="true" />
                  <span>Reset</span>
                </button>

                <button
                  className={s.tombolKontrol}
                  type="button"
                  disabled={tahap <= 1}
                  onClick={() => setTahap((t) => Math.max(1, t - 1))}
                  aria-label="Tahap sebelumnya"
                >
                  <ChevronLeft size={15} aria-hidden="true" />
                </button>

                <button
                  className={s.tombolKontrol}
                  type="button"
                  disabled={tahap >= 5}
                  onClick={() => setTahap((t) => Math.min(5, t + 1))}
                  aria-label="Tahap selanjutnya"
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
              <span className={s.labelLapisanJudul}>Lapisan:</span>
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
                <span>Kontur Atap</span>
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
                <span>Bubungan & Vektor</span>
              </label>
              <label className={s.itemLapisan}>
                <input
                  type="checkbox"
                  checked={tampilModul}
                  onChange={(e) => setTampilModul(e.target.checked)}
                />
                <span>Modul PV</span>
              </label>
            </div>
          </div>
        </section>

        {/* Kolom Kanan: Panel Data Telemetri & Aksi */}
        <aside className={s.panelTelemetri} aria-labelledby="judul-telemetri">
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

          {/* Grid Metrik Data Geometri & Hasil */}
          <div className={s.gridMetrik} aria-label="Metrik teknis atap terdeteksi">
            <div className={`${s.itemMetrik} ${s.metrikUtama}`}>
              <span className={s.metrikLabel}>Kapasitas Modul PV</span>
              <span className={s.metrikNilai}>
                {kwp(bangunan.kwp)} · {bangunan.modules_count} modul
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
              <span className={s.metrikNilai}>{kwh(bangunan.e_ac_kwh_yr1)}</span>
            </div>

            <div className={s.itemMetrik}>
              <span className={s.metrikLabel}>Skor Keyakinan (IoU)</span>
              <span className={s.metrikNilai}>
                {bangunan.confidence.toFixed(2)} · {bangunan.confidence >= 0.7 ? "Tinggi" : "Fallback"}
              </span>
            </div>
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
        </aside>
      </div>
    </div>
  );

  if (mode === "modal") {
    return (
      <div className={s.wadahModal} role="dialog" aria-modal="true" aria-labelledby="judul-telemetri">
        <div className={s.kartuModal}>{konten}</div>
      </div>
    );
  }

  return konten;
}
