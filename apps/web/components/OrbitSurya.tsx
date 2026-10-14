import { useId } from "react";
import s from "./halamanBrand.module.css";

const lintasan = "M110 276a370 158 0 1 0 740 0a370 158 0 1 0-740 0";
const lintasanDalam = "M205 276a275 196 0 1 0 550 0a275 196 0 1 0-550 0";

export function OrbitSurya() {
  const id = useId().replace(/:/g, "");
  return (
    <svg className={s.orbitSurya} viewBox="0 0 960 520" fill="none" aria-hidden="true" focusable="false">
      <defs>
        <radialGradient id={`aura-${id}`}>
          <stop stopColor="var(--brand-amber)" stopOpacity="0.16" />
          <stop offset="0.55" stopColor="var(--brand-amber)" stopOpacity="0.035" />
          <stop offset="1" stopColor="var(--brand-amber)" stopOpacity="0" />
        </radialGradient>
        <linearGradient id={`ekor-${id}`} x1="0" y1="0" x2="1" y2="1">
          <stop stopColor="var(--brand-amber)" stopOpacity="0.02" />
          <stop offset="0.72" stopColor="var(--brand-amber)" stopOpacity="0.8" />
          <stop offset="1" stopColor="var(--brand-white)" />
        </linearGradient>
      </defs>
      <circle className={s.auraOrbit} cx="480" cy="250" r="245" fill={`url(#aura-${id})`} />
      <g className={s.lingkarOrbit} transform="rotate(-16 480 276)">
        <path className={s.dasarOrbit} d={lintasan} />
        <path className={s.ekorOrbit} d={lintasan} pathLength="1" stroke={`url(#ekor-${id})`} />
        <path className={s.titikOrbit} d={lintasan} pathLength="1" />
      </g>
      <g className={`${s.lingkarOrbit} ${s.lingkarDalam}`} transform="rotate(24 480 276)">
        <path className={s.dasarOrbit} d={lintasanDalam} />
        <path className={s.ekorOrbit} d={lintasanDalam} pathLength="1" stroke={`url(#ekor-${id})`} />
        <path className={s.titikOrbit} d={lintasanDalam} pathLength="1" />
      </g>
      <g className={s.penandaOrbit} stroke="var(--brand-amber)" strokeWidth="1">
        <path d="M474 55h12M480 49v12M162 204h8M166 200v8M804 335h8M808 331v8" />
        <circle cx="714" cy="128" r="2" fill="var(--brand-amber)" />
        <circle cx="277" cy="388" r="1.5" fill="var(--brand-amber)" />
      </g>
    </svg>
  );
}
