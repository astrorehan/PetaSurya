"use client";

import { useId, useState } from "react";
import h from "./huruf.module.css";

const HURUF = [
  { nama: "Geist · Arc", token: "--f-display", bobot: [400, 500, 600, 700] },
  { nama: "Inter · Arc", token: "--f-ui", bobot: [400, 500, 600, 700] },
  { nama: "IBM Plex Mono", token: "--f-mono", bobot: [400, 500, 600] },
] as const;

export function DemoHuruf() {
  const id = useId();
  const [keluarga, setKeluarga] = useState(0);
  const [bobot, setBobot] = useState(600);
  const [teks, setTeks] = useState("Atapmu, dihitung.");
  const huruf = HURUF[keluarga];
  return (
    <div className={h.lab}>
      <div className={h.labKontrol}>
        <label htmlFor={`${id}-font`}>Font
          <select id={`${id}-font`} aria-label="Font" value={keluarga} onChange={(e) => {
            const berikut = Number(e.target.value);
            setKeluarga(berikut);
            if (!(HURUF[berikut].bobot as readonly number[]).includes(bobot)) setBobot(HURUF[berikut].bobot[0]);
          }}>{HURUF.map((f, i) => <option key={f.nama} value={i}>{f.nama}</option>)}</select>
        </label>
        <label htmlFor={`${id}-bobot`}>Bobot
          <select id={`${id}-bobot`} aria-label="Bobot" value={bobot} onChange={(e) => setBobot(Number(e.target.value))}>
            {huruf.bobot.map((b) => <option key={b} value={b}>{b}</option>)}
          </select>
        </label>
        <label className={h.labTeks} htmlFor={`${id}-teks`}>Teks spesimen
          <input id={`${id}-teks`} value={teks} maxLength={120} onChange={(e) => setTeks(e.target.value)} />
        </label>
      </div>
      <div className={h.labSpesimen} data-arc={keluarga < 2 || undefined} style={{ fontFamily: `var(${huruf.token})`, fontWeight: bobot }}>
        <p>{teks || "Atapmu, dihitung."}</p>
        <p className={h.labKarakter}>Aa Bb Cc Dd Ee Ff Gg Hh Ii Jj Kk Ll Mm Nn</p>
        <p className={h.labKarakter}>0123456789 · Rp · kWh · m² · CO₂</p>
      </div>
      <p className={h.labSpek}>{keluarga < 2 ? "Arc · display: leading 1,1 / tracking −0,03 em · tubuh: leading 1,4 / tracking −0,01 em" : "IBM Plex Mono · data tabular bersatuan"}</p>
    </div>
  );
}
