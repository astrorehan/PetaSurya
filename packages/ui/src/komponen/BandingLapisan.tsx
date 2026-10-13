"use client";

import { useId, useState, type CSSProperties, type PointerEvent, type ReactNode } from "react";
import { ChevronsLeftRight } from "lucide-react";
import { Ikon } from "./Ikon";
import s from "./kreatif.module.css";

/** Pembanding dua lapisan pada bingkai yang sama; penggeser asli mendukung keyboard dan sentuhan. */
export function BandingLapisan({ sebelum, sesudah, labelSebelum, labelSesudah, label = "Batas perbandingan", bawaan = 50, rasio = "8 / 5" }: {
  sebelum: ReactNode;
  sesudah: ReactNode;
  labelSebelum: string;
  labelSesudah: string;
  label?: string;
  bawaan?: number;
  rasio?: string;
}) {
  const id = useId();
  const [posisi, setPosisi] = useState(Math.min(100, Math.max(0, bawaan)));
  function geser(event: PointerEvent<HTMLDivElement>) {
    const bingkai = event.currentTarget.getBoundingClientRect();
    if (bingkai.width) setPosisi(Math.round(Math.min(100, Math.max(0, (event.clientX - bingkai.left) / bingkai.width * 100))));
  }
  return (
    <div className={s.banding}>
      <div className={s.bingkai} style={{ "--banding-posisi": `${posisi}%`, aspectRatio: rasio } as CSSProperties} aria-hidden="true"
        onPointerDown={(event) => { if (event.button === 0) { event.currentTarget.setPointerCapture(event.pointerId); geser(event); } }}
        onPointerMove={(event) => { if (event.currentTarget.hasPointerCapture(event.pointerId)) geser(event); }}
        onPointerUp={(event) => { if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId); }}
        onPointerCancel={(event) => { if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId); }}>
        <div className={s.lapisan}>{sesudah}</div>
        <div className={`${s.lapisan} ${s.sebelum}`}>{sebelum}</div>
        <span className={s.pembatas}><span><Ikon ikon={ChevronsLeftRight} /></span></span>
      </div>
      <div className={s.labelBanding}><span>{labelSebelum}</span><span>{labelSesudah}</span></div>
      <label className={s.label} htmlFor={id}>{label}</label>
      <input id={id} className={s.penggeser} type="range" min={0} max={100} value={posisi}
        aria-valuetext={`${posisi}% ${labelSebelum}, ${100 - posisi}% ${labelSesudah}`}
        onChange={(event) => setPosisi(Number(event.target.value))} />
    </div>
  );
}
