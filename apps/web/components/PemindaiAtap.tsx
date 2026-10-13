"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { AlertTriangle, ChevronDown, Pause, Play, X } from "lucide-react";
import { Angka, DaftarData, Ikon, Lencana, Segmen, Tombol, kelasTombol, kwh, kwp, m2, rupiah } from "@petasurya/ui";
import s from "./pemindaiAtap.module.css";

import {
  type BangunanTargetPindai,
  type TileCitra,
  DAFTAR_BANGUNAN,
  TAHAP_INFO,
} from "./pemindaiData";

export type { BangunanTargetPindai, TileCitra };
export { DAFTAR_BANGUNAN, TAHAP_INFO };

const TAHAP_RINGKAS = ["Citra", "Atap", "Area", "Sumbu", "Potensi"];

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
  const [citraGagal, setCitraGagal] = useState(false);

  // Sakelar lapisan visual
  const [tampilSatelit, setTampilSatelit] = useState(true);
  const [tampilKontur, setTampilKontur] = useState(true);
  const [tampilSumbu, setTampilSumbu] = useState(true);
  const [tampilKompas, setTampilKompas] = useState(true);

  const wadahRef = useRef<HTMLDivElement>(null);
  const Judul = mode === "halaman" ? "h1" : "h2";

  const bangunan = DAFTAR_BANGUNAN[indeksBangunan];
  const sempit = useSyncExternalStore(langgananSempit, cekSempit, () => false);
  const lebarKanvas = Math.min(640, Math.max(320, bangunan.bbox[2] + 72, (bangunan.bbox[3] + 72) * 4 / 3));
  const tinggiKanvas = lebarKanvas * 3 / 4;
  const viewBox = sempit ? `${320 - lebarKanvas / 2} ${240 - tinggiKanvas / 2} ${lebarKanvas} ${tinggiKanvas}` : "0 0 640 480";
  const posisiKompas = sempit ? `translate(${320 + lebarKanvas / 2 - 44}, ${240 - tinggiKanvas / 2 + 44})` : "translate(596, 44)";
  const tahapAktif = TAHAP_INFO[tahap - 1];
  const spekAktif = bangunan.specs[550];

  useEffect(() => {
    let aktif = true;
    // Tile dapat gagal sebelum hidrasi; periksa lagi dengan listener yang sudah terpasang.
    const gambar = bangunan.tiles.map((tile) => {
      const citra = new Image();
      citra.onerror = () => { if (aktif) setCitraGagal(true); };
      citra.src = tile.url;
      return citra;
    });
    return () => {
      aktif = false;
      gambar.forEach((citra) => { citra.onerror = null; });
    };
  }, [bangunan]);

  // Sinkronisasi URL query param saat ganti bangunan di mode halaman
  useEffect(() => {
    if (mode === "halaman" && typeof window !== "undefined") {
      const url = new URL(window.location.href);
      url.searchParams.set("id", String(bangunan.id));
      window.history.replaceState(null, "", url.toString());
    }
  }, [bangunan.id, mode]);

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
    setCitraGagal(false);
    setTahap(1);
    setSedangMemindai(false);
  };

  const polygonString = useMemo(() => {
    return bangunan.polygon.map(([x, y]) => `${x},${y}`).join(" ");
  }, [bangunan]);

  const maskPath = useMemo(() => bangunan.mask_rings.map((rings) => rings.map((ring) =>
    `M ${ring.map(([x, y]) => `${x} ${y}`).join(" L ")} Z`).join(" ")).join(" "), [bangunan]);

  // Sudut sumbu geometri pada dial kompas.
  const rotasiJarum = bangunan.azimuth_deg;

  const konten = (
    <div className={s.wadah} ref={wadahRef}>
      <header className={s.kepala}>
        <div className={s.labelBaris}>
          <Judul id="judul-modal-pemindai" className={s.judul}>Pindai atap</Judul>
          <Lencana contoh>Hasil tersimpan</Lencana>
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
                <pattern id="arsirPerkiraan" width="8" height="8" patternTransform="rotate(45)" patternUnits="userSpaceOnUse">
                  <line x1="0" y1="0" x2="0" y2="8" stroke="#E8920F" strokeWidth="1" />
                </pattern>
                {/* Pola Grid Millimeter Teknis */}
                <pattern id="gridTeknis" width="40" height="40" patternUnits="userSpaceOnUse">
                  <path d="M 40 0 L 0 0 0 40" fill="none" stroke="rgba(174, 183, 199, 0.08)" strokeWidth="0.8" />
                  <circle cx="20" cy="20" r="0.8" fill="rgba(174, 183, 199, 0.12)" />
                </pattern>

                {/* Marker Panah Vektor Azimut */}
                <marker id="panahAzimut" markerWidth="8" markerHeight="8" refX="6" refY="4" orient="auto">
                  <path d="M 0 0 L 8 4 L 0 8 Z" fill="#E8920F" />
                </marker>
              </defs>

              {/* Latar Grid Teknis Millimeter */}
              <rect width="640" height="480" fill="url(#gridTeknis)" />

              {/* Citra daring memiliki georeferensi yang sama dengan masukan model. */}
              {tampilSatelit ? (
                <g id="satelit-tiles" opacity="0.88">
                  {bangunan.tiles.map((t, ti) => (
                    <image
                      key={ti}
                      href={t.url}
                      onError={() => setCitraGagal(true)}
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
                  <circle cx={bangunan.centroid[0]} cy={bangunan.centroid[1]} r="7" fill="#E8920F" opacity="0.9" />
                  <circle cx={bangunan.centroid[0]} cy={bangunan.centroid[1]} r="15" fill="none" stroke="#E8920F" strokeWidth="1.2" opacity="0.6" />
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

              {/* TAHAP 2: Mask hasil model; fallback hanya menampilkan footprint berarsir. */}
              {tahap >= 2 && tampilKontur ? (
                <g id="tahap-2-kontur">
                  {bangunan.method === "cv" ? (
                    <path d={maskPath} fillRule="evenodd" fill="rgba(232, 144, 15, 0.25)" stroke="#E8920F" strokeWidth="2.5" strokeLinejoin="round" />
                  ) : (
                    <polygon points={polygonString} fill="url(#arsirPerkiraan)" stroke="#E8920F" strokeWidth="2" strokeDasharray="5 4" />
                  )}
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
                      {bangunan.method === "cv" ? "LUAS MASK" : "LUAS PERKIRAAN"} {m2(bangunan.roof_area_m2)}
                    </text>
                  ) : null}
                </g>
              ) : null}

              {/* TAHAP 4: Sumbu geometri, bukan deteksi bubungan atau arah hadap bidang. */}
              {tahap >= 4 && tampilSumbu ? (
                <g id="tahap-4-orientasi">
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
                      SUMBU {bangunan.azimuth_deg}°
                    </text>
                  ) : null}
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
                  {/* Jarum sumbu geometri. */}
                  <g transform={`rotate(${rotasiJarum})`}>
                    <line x1="0" y1="0" x2="0" y2="-22" stroke="#E8920F" strokeWidth="2" markerEnd="url(#panahAzimut)" />
                    <circle cx="0" cy="0" r="2.5" fill="#E8920F" />
                  </g>
                  <text x="0" y="38" fill="#AEB7C7" fontFamily="monospace" fontSize="8" textAnchor="middle">
                    {bangunan.azimuth_deg}°
                  </text>
                </g>
              ) : null}

            </svg>

            <div className={s.hudBawah}>
              <span>Esri · Vantor · Earthstar Geographics</span>
              <span>{citraGagal ? "Citra tidak tersedia" : "Analisis tersimpan"}</span>
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
                  { label: "Sumbu", nilai: tampilSumbu, ubah: setTampilSumbu },
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
            label="Potensi berbasis luas"
            nilai={kwp(spekAktif.kwp)}
            ukuran="display"
            aksen="surya"
            keterangan={`${spekAktif.count} modul setara · ${m2(bangunan.usable_area_m2)} luas perhitungan (asumsi)`}
          />

          <p className={s.bantuan}>Batas atap belum diverifikasi. Jumlah panel yang dapat dipasang belum dihitung.</p>
          <p className={s.bantuan}>Modul Jinko 550 Wp. Kemiringan 15° dan cadangan area 15% adalah asumsi.</p>
          {tahap >= 3 ? <p className={s.bantuan}>Halangan dan bayangan belum diukur.</p> : null}


          <Link className={kelasTombol()} href={`/atap/${bangunan.id}`} onClick={onTutup}>Lihat hasil bangunan</Link>

          <details className={s.rincian}>
            <summary>Asal estimasi <Ikon ikon={ChevronDown} /></summary>
            <DaftarData baris={[
              { label: "Produksi tahun pertama", nilai: kwh(spekAktif.e_ac_kwh_yr1) },
              { label: "Hemat tahun pertama", nilai: rupiah(spekAktif.savings_idr_yr1) },
              { label: "Luas bangunan", nilai: m2(bangunan.footprint_m2) },
              { label: "Luas mask / perkiraan", nilai: m2(bangunan.roof_area_m2) },
              { label: "Luas perhitungan (asumsi)", nilai: m2(bangunan.usable_area_m2) },
              { label: "Luas satu modul", nilai: bangunan.luas_modul_m2.toLocaleString("id-ID", { maximumFractionDigits: 3 }) + " m²" },
              { label: "Modul setara dari luas", nilai: spekAktif.count.toLocaleString("id-ID") },
              { label: "Kapasitas pasang", nilai: "Belum dihitung" },
              { label: "Penghalang", nilai: "Belum diukur" },
              { label: "Kemiringan (asumsi)", nilai: bangunan.tilt_deg.toLocaleString("id-ID") + "°" },
              { label: "Orientasi", nilai: bangunan.arah_label },
            ]} />
          </details>

          <details className={s.rincian}>
            <summary>Tentang tahap ini <Ikon ikon={ChevronDown} /></summary>
            <h2 className={s.kartuInfoJudul}>{tahapAktif.subjudul}</h2>
            <p className={s.penjelasanTahap}>{tahapAktif.penjelasan}</p>
            <p className={s.bantuan}>Mask ini dihasilkan model dan disimpan. Pemutaran menampilkan tahap analisis tersebut.</p>
          </details>

          <details className={s.rincian}>
            <summary>Data teknis <Ikon ikon={ChevronDown} /></summary>
            <DaftarData baris={[
              { label: "Skor penyaringan", nilai: bangunan.confidence.toLocaleString("id-ID", { maximumFractionDigits: 3 }) + " / 1 (belum dikalibrasi)" },
              { label: "IoU terhadap OSM", nilai: bangunan.iou_footprint.toLocaleString("id-ID", { maximumFractionDigits: 3 }) },
              { label: "Waktu proses tersimpan", nilai: bangunan.durasi_detik.toLocaleString("id-ID") + " detik" },
              { label: "Metode", nilai: bangunan.method === "cv" ? "Analisis citra" : "Jejak bangunan" },
              { label: "Model", nilai: bangunan.model_version },
              { label: "Koordinat", nilai: bangunan.koordinat.map((n) => n.toLocaleString("id-ID", { maximumFractionDigits: 5 })).join("; ") },
            ]} />
          </details>

          <details className={s.rincian}>
            <summary>Log demo <Ikon ikon={ChevronDown} /></summary>
            <div className={s.terminalIsi} role="log" aria-label="Catatan tahap analisis">
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
