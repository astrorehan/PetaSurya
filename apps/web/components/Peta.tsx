"use client";

import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { Crosshair, RotateCw, Satellite, Search } from "lucide-react";
import * as maplibregl from "maplibre-gl";
import type { Map as MapLibreMap, MapMouseEvent } from "maplibre-gl";
import type { MultiPolygonGeoJSON, PolygonGeoJSON } from "@petasurya/contracts";
import { Logo, SKALA_KOTA_KWP } from "@petasurya/ui";
import { useTema } from "./Tema";
import s from "./peta.module.css";
import "maplibre-gl/dist/maplibre-gl.css";

const GAYA_PETA = {
  light: "https://tiles.openfreemap.org/styles/liberty",
  dark: "https://tiles.openfreemap.org/styles/dark",
} as const;
const URL_WORKER_PETA = "/maplibre/maplibre-gl-worker.mjs";

const PUSAT_BENGKULU: [number, number] = [102.269, -3.7618];
const ZOOM_AWAL = 15.1;
const SUMBER_CITRA = "esri-world-imagery";
const LAPISAN_CITRA = "esri-world-imagery-layer";
const SUMBER_ATAP = "petasurya-atap-sorot";
const LAPISAN_ATAP_ISI = "petasurya-atap-sorot-isi";
const LAPISAN_ATAP_GARIS = "petasurya-atap-sorot-garis";
const SUMBER_BANGUNAN = "petasurya-bangunan";
const LAPISAN_BANGUNAN_ISI = "petasurya-bangunan-isi";
const LAPISAN_BANGUNAN_GARIS = "petasurya-bangunan-garis";
const SUMBER_WILAYAH = "petasurya-wilayah";
const LAPISAN_WILAYAH_ISI = "petasurya-wilayah-isi";
const LAPISAN_WILAYAH_GARIS = "petasurya-wilayah-garis";
const LAPISAN_WILAYAH_TERPILIH_ISI = "petasurya-wilayah-terpilih-isi";
const LAPISAN_WILAYAH_TERPILIH_GARIS = "petasurya-wilayah-terpilih-garis";

type GeometriSorot = PolygonGeoJSON | MultiPolygonGeoJSON;
export type BangunanPeta = {
  id: number;
  nama?: string | null;
  geom: PolygonGeoJSON;
};
export type WilayahPeta = {
  id: string;
  nama: string;
  geom: GeometriSorot;
  kwp?: number | null;
};
type FiturGeoJSON<TProperties extends Record<string, unknown> = Record<string, never>> = {
  type: "Feature";
  properties: TProperties;
  geometry: {
    type: "Polygon" | "MultiPolygon";
    coordinates: number[][][] | number[][][][];
  };
};
type FiturBangunan = FiturGeoJSON<{ id: string; nama: string }>;
type FiturWilayah = FiturGeoJSON<{ id: string; nama: string; kwp: number | null }>;

function gerakKe(map: MapLibreMap, center: [number, number], zoom: number) {
  const berkurang = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (berkurang) {
    map.jumpTo({ center, zoom });
  } else {
    map.flyTo({ center, zoom, duration: 550, essential: false });
  }
}

function pasangCitra(map: MapLibreMap, tampil: boolean) {
  if (!map.getSource(SUMBER_CITRA)) {
    map.addSource(SUMBER_CITRA, {
      type: "raster",
      tiles: ["https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"],
      tileSize: 256,
      attribution: "Tiles © Esri",
    });
  }

  if (!map.getLayer(LAPISAN_CITRA)) {
    map.addLayer({
      id: LAPISAN_CITRA,
      type: "raster",
      source: SUMBER_CITRA,
      layout: { visibility: tampil ? "visible" : "none" },
      paint: { "raster-opacity": 0.94 },
    });
  } else {
    map.setLayoutProperty(LAPISAN_CITRA, "visibility", tampil ? "visible" : "none");
  }
}

function titikGeometri(koordinat: unknown, bounds: maplibregl.LngLatBounds) {
  if (!Array.isArray(koordinat)) return;
  if (koordinat.length === 2 && koordinat.every((nilai) => typeof nilai === "number")) {
    bounds.extend([koordinat[0], koordinat[1]]);
    return;
  }
  koordinat.forEach((anak) => titikGeometri(anak, bounds));
}

function pasangSorot(map: MapLibreMap, geometri: GeometriSorot | null | undefined, sesuaikan=true) {
  if (!geometri) return;

  const data: FiturGeoJSON = {
    type: "Feature",
    properties: {},
    geometry: geometri,
  };

  const sumber = map.getSource(SUMBER_ATAP);
  if (!sumber) {
    map.addSource(SUMBER_ATAP, { type: "geojson", data });
  } else if (sumber instanceof maplibregl.GeoJSONSource) {
    sumber.setData(data);
  }

  if (!map.getLayer(LAPISAN_ATAP_ISI)) {
    map.addLayer({
      id: LAPISAN_ATAP_ISI,
      type: "fill",
      source: SUMBER_ATAP,
      paint: {
        "fill-color": "#e8920f",
        "fill-opacity": 0.28,
      },
    });
  }

  if (!map.getLayer(LAPISAN_ATAP_GARIS)) {
    map.addLayer({
      id: LAPISAN_ATAP_GARIS,
      type: "line",
      source: SUMBER_ATAP,
      paint: {
        "line-color": getComputedStyle(document.documentElement).getPropertyValue("--surya").trim(),
        "line-width": 3,
        "line-opacity": 0.92,
      },
    });
  }

  const bounds = new maplibregl.LngLatBounds();
  titikGeometri(geometri.coordinates, bounds);
  if (sesuaikan && !bounds.isEmpty()) {
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    map.fitBounds(bounds, { padding: 56, maxZoom: 18, duration: reducedMotion ? 0 : 500 });
  }
}

function pasangBangunan(map: MapLibreMap, bangunan: BangunanPeta[], sesuaikan=true) {

  const data: { type: "FeatureCollection"; features: FiturBangunan[] } = {
    type: "FeatureCollection",
    features: bangunan.map((item) => ({
      type: "Feature",
      properties: { id: String(item.id), nama: item.nama ?? `Bangunan ${item.id}` },
      geometry: item.geom,
    })),
  };
  const sumber = map.getSource(SUMBER_BANGUNAN);
  if (!sumber) {
    map.addSource(SUMBER_BANGUNAN, { type: "geojson", data });
  } else if (sumber instanceof maplibregl.GeoJSONSource) {
    sumber.setData(data);
  }

  if (!map.getLayer(LAPISAN_BANGUNAN_ISI)) {
    map.addLayer({
      id: LAPISAN_BANGUNAN_ISI,
      type: "fill",
      source: SUMBER_BANGUNAN,
      paint: { "fill-color": "#e8920f", "fill-opacity": 0.2 },
    });
  }
  if (!map.getLayer(LAPISAN_BANGUNAN_GARIS)) {
    map.addLayer({
      id: LAPISAN_BANGUNAN_GARIS,
      type: "line",
      source: SUMBER_BANGUNAN,
      paint: { "line-color": "#e8920f", "line-width": 2, "line-opacity": 0.92 },
    });
  }

  const bounds = new maplibregl.LngLatBounds();
  bangunan.forEach((item) => titikGeometri(item.geom.coordinates, bounds));
  if (sesuaikan && !bounds.isEmpty()) {
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    map.fitBounds(bounds, { padding: 64, maxZoom: 15.5, duration: reducedMotion ? 0 : 500 });
  }
}

function pasangWilayah(map: MapLibreMap, wilayah: WilayahPeta[], wilayahTerpilih: string | null, sesuaikan = true) {
  if (!wilayah.length) return;

  const data: { type: "FeatureCollection"; features: FiturWilayah[] } = {
    type: "FeatureCollection",
    features: wilayah.map((item) => ({
      type: "Feature",
      properties: { id: item.id, nama: item.nama, kwp: item.kwp ?? null },
      geometry: item.geom,
    })),
  };
  const sumber = map.getSource(SUMBER_WILAYAH);
  if (!sumber) {
    map.addSource(SUMBER_WILAYAH, { type: "geojson", data });
  } else if (sumber instanceof maplibregl.GeoJSONSource) {
    sumber.setData(data);
  }

  if (!map.getLayer(LAPISAN_WILAYAH_ISI)) {
    const warna = ["step", ["coalesce", ["get", "kwp"], 0], SKALA_KOTA_KWP[0].warna,
      ...SKALA_KOTA_KWP.slice(1).flatMap((kelas) => [kelas.batas, kelas.warna])
    ] as maplibregl.ExpressionSpecification;
    map.addLayer({
      id: LAPISAN_WILAYAH_ISI,
      type: "fill",
      source: SUMBER_WILAYAH,
      paint: { "fill-color": warna, "fill-opacity": ["case", ["==", ["get", "kwp"], null], 0.1, 0.72] },
    });
  }
  if (!map.getLayer(LAPISAN_WILAYAH_GARIS)) {
    map.addLayer({
      id: LAPISAN_WILAYAH_GARIS,
      type: "line",
      source: SUMBER_WILAYAH,
      paint: { "line-color": "#e8920f", "line-width": 1.6, "line-opacity": 0.92 },
    });
  }
  const filter = ["==", ["get", "id"], wilayahTerpilih ?? ""] as maplibregl.FilterSpecification;
  if (!map.getLayer(LAPISAN_WILAYAH_TERPILIH_ISI)) {
    map.addLayer({
      id: LAPISAN_WILAYAH_TERPILIH_ISI,
      type: "fill",
      source: SUMBER_WILAYAH,
      filter,
      paint: { "fill-color": "#e8920f", "fill-opacity": 0.08 },
    });
  }
  if (!map.getLayer(LAPISAN_WILAYAH_TERPILIH_GARIS)) {
    map.addLayer({
      id: LAPISAN_WILAYAH_TERPILIH_GARIS,
      type: "line",
      source: SUMBER_WILAYAH,
      filter,
      paint: { "line-color": "#ffc46b", "line-width": 3, "line-opacity": 1 },
    });
  }

  const bounds = new maplibregl.LngLatBounds();
  wilayah.forEach((item) => titikGeometri(item.geom.coordinates, bounds));
  if (sesuaikan && !bounds.isEmpty()) {
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    map.fitBounds(bounds, { padding: 64, maxZoom: 12.5, duration: reducedMotion ? 0 : 500 });
  }
}

type PetaProps = {
  label?: string;
  className?: string;
  tinggi?: number;
  geometriSorot?: GeometriSorot | null;
  bangunan?: BangunanPeta[];
  onPilihBangunan?: (id: number) => void;
  wilayah?: WilayahPeta[];
  wilayahTerpilih?: string | null;
  onPilihWilayah?: (id: string) => void;
  tampilanKosong?: boolean;
  onCariArea?: (lat: number, lon: number) => void;
  mencariArea?: boolean;
  batasPencarian?: [number, number, number, number];
  pertahankanKamera?: boolean;
  satelitAwal?: boolean;
  pratinjau?: ReactNode;
};

export function Peta({
  label = "Peta lokasi",
  className,
  tinggi = 440,
  geometriSorot,
  bangunan = [],
  onPilihBangunan,
  wilayah = [],
  wilayahTerpilih = null,
  onPilihWilayah,
  tampilanKosong = false,
  onCariArea,
  mencariArea = false,
  batasPencarian,
  pertahankanKamera = false,
  satelitAwal = false,
  pratinjau,
}: PetaProps) {
  const { terpilih, siap } = useTema();
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const gayaRef = useRef(GAYA_PETA[terpilih]);
  const satelitRef = useRef(satelitAwal);
  const [satelit, setSatelit] = useState(satelitAwal);
  const [petaSiap, setPetaSiap] = useState(false);
  const [citraLambat, setCitraLambat] = useState(false);
  const [petaGagal, setPetaGagal] = useState(false);
  const [percobaan, setPercobaan] = useState(0);
  const terkini = useRef({bangunan, geometriSorot, wilayah, wilayahTerpilih, onPilihBangunan, onPilihWilayah, label, batasPencarian, pertahankanKamera});
  terkini.current = {bangunan, geometriSorot, wilayah, wilayahTerpilih, onPilihBangunan, onPilihWilayah, label, batasPencarian, pertahankanKamera};

  useEffect(() => {
    if (petaSiap) return;
    const jadwal = setTimeout(() => setCitraLambat(true), 8000);
    return () => clearTimeout(jadwal);
  }, [petaSiap, percobaan]);

  useEffect(() => {
    const container = containerRef.current;
    if (!siap || !container || mapRef.current) return;

    gayaRef.current = GAYA_PETA[terpilih];
    maplibregl.setWorkerUrl(URL_WORKER_PETA);

    let map: MapLibreMap;
    try {
      map = new maplibregl.Map({
        container,
        style: gayaRef.current,
        center: PUSAT_BENGKULU,
        zoom: ZOOM_AWAL,
        attributionControl: false,
        keyboard: true,
        maxBounds: terkini.current.batasPencarian ? [[terkini.current.batasPencarian[0],terkini.current.batasPencarian[1]],[terkini.current.batasPencarian[2],terkini.current.batasPencarian[3]]] : undefined,
      });
    } catch {
      setPetaGagal(true);
      return;
    }
    mapRef.current = map;
    // Peta dapat dimulai saat panel ponsel tersembunyi; ukur ulang saat dibuka.
    const ukuran = new ResizeObserver(([entry]) => {
      if (entry.contentRect.width > 0 && entry.contentRect.height > 0) map.resize();
    });
    ukuran.observe(container);
    map.addControl(new maplibregl.NavigationControl({ showCompass: true }), "top-right");
    map.addControl(
      new maplibregl.AttributionControl({ compact: true }),
      "bottom-right",
    );

    const saatFiturDiklik = (event: MapMouseEvent) => {
      const data = terkini.current;
      if (data.wilayah.length && data.onPilihWilayah && map.getLayer(LAPISAN_WILAYAH_ISI)) {
        const fiturWilayah = map.queryRenderedFeatures(event.point, {
          layers: [LAPISAN_WILAYAH_ISI, LAPISAN_WILAYAH_TERPILIH_ISI],
        });
        const idWilayah = fiturWilayah[0]?.properties?.id;
        if (typeof idWilayah === "string") {
          data.onPilihWilayah(idWilayah);
          return;
        }
      }
      if (data.bangunan.length && data.onPilihBangunan && map.getLayer(LAPISAN_BANGUNAN_ISI)) {
        const fiturBangunan = map.queryRenderedFeatures(event.point, { layers: [LAPISAN_BANGUNAN_ISI] });
        const idBangunan = fiturBangunan[0]?.properties?.id;
        if (typeof idBangunan === "string") data.onPilihBangunan(Number(idBangunan));
      }
    };
    const saatPenunjukBergerak = (event: MapMouseEvent) => {
      const data = terkini.current;
      const lapisan = [
        ...(data.onPilihBangunan ? [LAPISAN_BANGUNAN_ISI] : []),
        ...(data.onPilihWilayah ? [LAPISAN_WILAYAH_ISI, LAPISAN_WILAYAH_TERPILIH_ISI] : []),
      ].filter((id) => map.getLayer(id));
      map.getCanvas().style.cursor = lapisan.length && map.queryRenderedFeatures(event.point, { layers: lapisan }).length ? "pointer" : "";
    };
    // Pendengar tetap aktif ketika pencarian awal kosong lalu menghasilkan bangunan.
    map.on("click", saatFiturDiklik);
    map.on("mousemove", saatPenunjukBergerak);
    let kameraAwal = true;

    const siapGaya = () => {
      const data = terkini.current;
      pasangCitra(map, satelitRef.current);
      pasangSorot(map, data.geometriSorot, kameraAwal);
      pasangBangunan(map, data.bangunan, kameraAwal);
      pasangWilayah(map, data.wilayah, data.wilayahTerpilih, kameraAwal);
      kameraAwal = false;
    };
    map.on("style.load", siapGaya);
    map.once("load", () => {
      const canvas = map.getCanvas();
      canvas.tabIndex = 0;
      canvas.setAttribute("aria-label", `${label}. Gunakan tombol panah untuk menggeser peta.`);
      const labelKontrol: Record<string, string> = {
        ".maplibregl-ctrl-zoom-in": "Perbesar peta",
        ".maplibregl-ctrl-zoom-out": "Perkecil peta",
        ".maplibregl-ctrl-compass": "Kembalikan arah utara",
        ".maplibregl-ctrl-attrib-button": "Sumber peta",
      };
      Object.entries(labelKontrol).forEach(([selector, teks]) => {
        const tombol = container.querySelector<HTMLButtonElement>(selector);
        tombol?.setAttribute("aria-label", teks);
        tombol?.setAttribute("title", teks);
      });
      // Atribusi ringkas terbuka saat muat; tutup agar tidak menutupi peta. Tombol (i) tetap membukanya.
      container.querySelector(".maplibregl-ctrl-attrib")?.classList.remove("maplibregl-compact-show");
      siapGaya();
      setPetaSiap(true);
    });

    return () => {
      ukuran.disconnect();
      map.off("click", saatFiturDiklik);
      map.off("mousemove", saatPenunjukBergerak);
      map.remove();
      mapRef.current = null;
    };
  // Geometri dan pilihan diperbarui tanpa menghapus kamera yang sedang ditelusuri.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [siap, percobaan]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map?.getSource(SUMBER_BANGUNAN)) return;
    pasangBangunan(map, bangunan, !pertahankanKamera);
    pasangSorot(map, geometriSorot, !pertahankanKamera);
    pasangWilayah(map, wilayah, wilayahTerpilih, false);
  }, [bangunan, geometriSorot, pertahankanKamera, wilayah, wilayahTerpilih]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const gaya = GAYA_PETA[terpilih];
    if (gaya === gayaRef.current) return;
    gayaRef.current = gaya;
    map.setStyle(gaya);
  }, [terpilih]);

  useEffect(() => {
    satelitRef.current = satelit;
    const map = mapRef.current;
    if (map?.getLayer(LAPISAN_CITRA)) pasangCitra(map, satelit);
  }, [satelit]);

  const kelas = [s.peta, className].filter(Boolean).join(" ");
  const gaya: CSSProperties = { height: `var(--tinggi-peta, ${tinggi}px)` };

  return (
    <figure className={kelas} style={gaya} aria-label={label}>
      <div className={s.toolbar} aria-label="Alat peta">
        {onCariArea && <button className={s.tombolPeta} type="button" disabled={mencariArea || !petaSiap} onClick={() => {const pusat=mapRef.current?.getCenter();if(pusat)onCariArea(pusat.lat,pusat.lng);}}><Search size={16} aria-hidden="true"/><span>{mencariArea ? "Mencari…" : "Cari area ini · 200 m"}</span></button>}
        <button
          className={s.tombolPeta}
          type="button"
          disabled={!petaSiap}
          onClick={() => {
            if (!mapRef.current) return;
            if (wilayah.length) pasangWilayah(mapRef.current, wilayah, wilayahTerpilih);
            else gerakKe(mapRef.current, PUSAT_BENGKULU, ZOOM_AWAL);
          }}
          title="Pusatkan di Bengkulu"
        >
          <Crosshair size={16} aria-hidden="true" />
          <span>Pusatkan</span>
        </button>
        <button
          className={`${s.tombolPeta} ${s.tombolSatelit}`}
          type="button"
          disabled={!petaSiap}
          aria-pressed={satelit}
          onClick={() => setSatelit((aktif) => !aktif)}
          title={satelit ? "Gunakan peta jalan" : "Tampilkan citra satelit"}
        >
          <Satellite size={16} aria-hidden="true" />
          <span>{satelit ? "Peta jalan" : "Satelit"}</span>
        </button>
      </div>
      <div ref={containerRef} className={s.kanvas} />
      {!petaSiap && <div className={s.pratinjau}>
        {pratinjau && <div aria-hidden="true">{pratinjau}</div>}
        <section className={s.statusPeta} aria-label="Status peta">
          <p role="status">{petaGagal ? "Peta tidak dapat ditampilkan di browser ini." : citraLambat ? "Peta belum termuat. Periksa koneksi atau pilih bangunan dari daftar." : "Menyiapkan peta…"}</p>
          {(petaGagal || citraLambat) && <button type="button" onClick={() => { setPetaSiap(false); setPetaGagal(false); setCitraLambat(false); setPercobaan((nilai) => nilai + 1); }}><RotateCw size={14} aria-hidden="true" /> Coba muat peta</button>}
        </section>
      </div>}
      {tampilanKosong ? <div className={s.arsiranKosong} aria-hidden="true" /> : null}
      <div className={s.watermark} aria-hidden="true">
        <Logo size={48} mono label="" />
      </div>
    </figure>
  );
}
