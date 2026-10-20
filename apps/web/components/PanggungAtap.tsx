"use client";

import { useId, type CSSProperties } from "react";
import type { PaketPemindaian } from "@petasurya/contracts";
import { Ikon } from "@petasurya/ui";
import { Crosshair } from "lucide-react";
import s from "./motionAtap.module.css";

const jalur = (ring: number[][]) => `M${ring.map(p => p.join(",")).join(" L")}Z`;

/** Citra, sorotan, dan kontur bergerak dalam koordinat yang sama. */
export function PanggungAtap({ frame, footprint, mask, bbox, viewBox, osm, asli = false, demo, memindai, citraGagal, onCitraGagal, label, fokus, nilai }: {
  frame: PaketPemindaian["bingkai"];
  footprint: number[][];
  mask: string;
  bbox: [number, number, number, number];
  viewBox: string;
  osm: boolean;
  asli?: boolean;
  demo: boolean;
  memindai: boolean;
  citraGagal: boolean;
  onCitraGagal: () => void;
  label: string;
  fokus: boolean;
  nilai: string;
}) {
  const id = useId().replace(/:/g, "");
  const [x, y, w, h] = bbox;
  const [vx, vy, vw, vh] = viewBox.split(" ").map(Number);
  const kontur = osm || !mask ? jalur(footprint) : mask;
  const sudut = `M${x-12} ${y+12}v-24h24 M${x+w-12} ${y-12}h24v24 M${x+w+12} ${y+h-12}v24h-24 M${x+12} ${y+h+12}h-24v-24`;
  const gaya = { "--lintasan-scan": `${h+24}px`, transformOrigin: `${x+w/2}px ${y+h/2}px` } as CSSProperties;
  return (
    <div className={s.panggung} style={{aspectRatio:`${vw} / ${vh}`}} data-babak={osm ? "bangunan" : "batas"} data-demo={demo || undefined} data-memindai={memindai || undefined}>
      <svg className={s.kanvas} viewBox={viewBox} role="img" tabIndex={fokus ? 0 : undefined} aria-label={label}>
        <defs>
          <mask id={`${id}-sorot`} maskUnits="userSpaceOnUse" x={vx} y={vy} width={vw} height={vh}>
            <rect x={vx} y={vy} width={vw} height={vh} fill="white" />
            <path d={kontur} fill="black" fillRule="evenodd" />
          </mask>
          <pattern id={`${id}-arsir`} width="8" height="8" patternUnits="userSpaceOnUse"><path d="M0 8L8 0" stroke="var(--surya)" strokeWidth="1"/></pattern>
        </defs>
        <g className={s.kamera} style={gaya}>
          {frame.tiles.map(t => <image key={t.url} href={t.url} x={t.x} y={t.y} width="256" height="256" onError={onCitraGagal}/>)}
          {!asli && <><rect className={s.luarSorot} x={vx} y={vy} width={vw} height={vh} mask={`url(#${id}-sorot)`} />
          {osm ? <path id="jejak-osm" className={s.jejak} d={jalur(footprint)} /> : <g id="batas-atap">
            <path className={s.bidangAtap} d={kontur} fill={mask ? "var(--surya)" : `url(#${id}-arsir)`} fillRule="evenodd" />
          </g>}
          <path className={s.kontur} d={kontur} pathLength={1} />
          <path className={s.pembidik} d={sudut} />
          {(demo && osm || memindai) && <g className={s.scan} style={gaya} aria-hidden="true">
            <rect className={s.scanPita} x={x-12} y={y-12} width={w+24} height={16}/>
            <path className={s.scanGaris} d={`M${x-12} ${y-12}H${x+w+12}`} />
          </g>}</>}
        </g>
      </svg>
      {!asli && <div className={s.keterangan} aria-hidden="true"><Ikon ikon={Crosshair}/><span>{osm ? "Bangunan terpilih" : mask ? "Kontur atap" : "Perkiraan OSM"}<strong>{nilai}</strong></span></div>}
      {citraGagal && <span className={s.citraKosong} aria-hidden="true">Citra tidak tersedia</span>}
    </div>
  );
}
