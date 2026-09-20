"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import { Crosshair, Satellite } from "lucide-react";
import * as maplibregl from "maplibre-gl";
import type { Map as MapLibreMap } from "maplibre-gl";
import { Logo } from "@petasurya/ui";
import { useTema } from "./Tema";
import s from "./peta.module.css";
import "maplibre-gl/dist/maplibre-gl.css";

const GAYA_PETA = {
  light: "https://tiles.openfreemap.org/styles/liberty",
  dark: "https://tiles.openfreemap.org/styles/dark",
} as const;

const PUSAT_BENGKULU: [number, number] = [102.269, -3.7618];
const ZOOM_AWAL = 15.1;
const SUMBER_CITRA = "esri-world-imagery";
const LAPISAN_CITRA = "esri-world-imagery-layer";

type PetaProps = {
  label?: string;
  className?: string;
  tinggi?: number;
};

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

export function Peta({ label = "Peta lokasi", className, tinggi = 440 }: PetaProps) {
  const { terpilih } = useTema();
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const gayaRef = useRef(GAYA_PETA[terpilih]);
  const satelitRef = useRef(false);
  const [satelit, setSatelit] = useState(false);

  useEffect(() => {
    const container = containerRef.current;
    if (!container || mapRef.current) return;

    const map = new maplibregl.Map({
      container,
      style: gayaRef.current,
      center: PUSAT_BENGKULU,
      zoom: ZOOM_AWAL,
      attributionControl: false,
      keyboard: true,
    });
    mapRef.current = map;
    map.addControl(new maplibregl.NavigationControl({ showCompass: true }), "top-right");
    map.addControl(
      new maplibregl.AttributionControl({
        compact: true,
        customAttribution: "OpenFreeMap © OpenMapTiles © OpenStreetMap",
      }),
      "bottom-right",
    );

    const siapGaya = () => pasangCitra(map, satelitRef.current);
    map.on("style.load", siapGaya);
    map.once("load", () => {
      const canvas = map.getCanvas();
      canvas.tabIndex = 0;
      canvas.setAttribute("aria-label", `${label}. Gunakan tombol panah untuk menggeser peta.`);
      siapGaya();
    });

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, [label]);

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
    if (map?.isStyleLoaded()) pasangCitra(map, satelit);
  }, [satelit]);

  const kelas = [s.peta, className].filter(Boolean).join(" ");
  const gaya: CSSProperties = { height: `${tinggi}px` };

  return (
    <figure className={kelas} style={gaya} aria-label={label}>
      <div ref={containerRef} className={s.kanvas} />
      <div className={s.toolbar} aria-label="Alat peta">
        <button
          className={s.tombolPeta}
          type="button"
          onClick={() => {
            if (mapRef.current) gerakKe(mapRef.current, PUSAT_BENGKULU, ZOOM_AWAL);
          }}
          title="Pusatkan di Bengkulu"
        >
          <Crosshair size={16} aria-hidden="true" />
          <span>Pusatkan</span>
        </button>
        <button
          className={`${s.tombolPeta} ${s.tombolSatelit}`}
          type="button"
          aria-pressed={satelit}
          onClick={() => setSatelit((aktif) => !aktif)}
          title={satelit ? "Gunakan peta jalan" : "Tampilkan citra satelit"}
        >
          <Satellite size={16} aria-hidden="true" />
          <span>{satelit ? "Peta jalan" : "Satelit"}</span>
        </button>
      </div>
      <div className={s.watermark} aria-hidden="true">
        <Logo size={48} mono label="" />
      </div>
      <figcaption className={s.keterangan}>
        <span>{satelit ? "Citra satelit · Esri World Imagery" : "Peta jalan · OpenFreeMap"}</span>
        <span>OpenStreetMap</span>
      </figcaption>
    </figure>
  );
}
