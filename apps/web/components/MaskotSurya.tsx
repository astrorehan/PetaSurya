"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { useGerakBrand } from "./GerakBrand";
import s from "./halamanBrand.module.css";

// Bingkai sprite mata pada kanvas badan 1254 × 1254 px (koordinat piksel sumber).
const KANVAS = 1254;
const MATA = [
  { sisi: "kiri", src: "/brand/surya-mascot-v4-mata-kiri.webp", x: 284, y: 579, w: 168, h: 225 },
  { sisi: "kanan", src: "/brand/surya-mascot-v4-mata-kanan.webp", x: 801, y: 579, w: 169, h: 225 },
] as const;

// Simpangan maksimum sebagai fraksi ukuran mata. Besar lirikan = 1 − e^(−d/R):
// penunjuk dekat menggeser sedikit, penunjuk jauh mendekati batas.
const GESER_X = 0.3;
const GESER_Y = 0.22;
const JARAK_R = 160; // px layar
// Mata di permukaan kubah: makin ke tepi, makin pipih (skala minimum ≈ 0,91).
const PIPIH = 0.3;
// Mata terasa berat: pegas respons 0,65 s dengan rasio redaman 0,7 (ω = 2π / respons).
// Lambat menyusul penunjuk, melewati sasaran ±5 % lalu diam; overshoot = e^(−ζπ/√(1−ζ²)).
const RESPONS = 0.65;
const REDAMAN = 0.7;
const OMEGA = (2 * Math.PI) / RESPONS;
const OMEGA_D = OMEGA * Math.sqrt(1 - REDAMAN * REDAMAN);
const LEPAS_SENTUH_MS = 1400;

type Sumbu = { x: number; y: number; vx: number; vy: number; tx: number; ty: number };

// Penyelesaian analitik pegas teredam kurang untuk simpangan e dan kecepatan v selama dt:
// stabil pada bingkai lambat, tidak bergantung laju bingkai.
function pegas(e: number, v: number, dt: number): [number, number] {
  const peluruhan = Math.exp(-REDAMAN * OMEGA * dt);
  const c = Math.cos(OMEGA_D * dt);
  const sn = Math.sin(OMEGA_D * dt);
  const b = (v + REDAMAN * OMEGA * e) / OMEGA_D;
  return [
    peluruhan * (e * c + b * sn),
    peluruhan * (c * (b * OMEGA_D - REDAMAN * OMEGA * e) - sn * (e * OMEGA_D + REDAMAN * OMEGA * b)),
  ];
}

const persen = (nilai: number) => `${((nilai / KANVAS) * 100).toFixed(3)}%`;
// Mata menunggu badan siap dilukis (decode selesai), bukan sekadar terunduh:
// badan 1254² didekode asinkron, sprite mata jauh lebih cepat.
const siapDilukis = (img: HTMLImageElement) => img.decode().catch(() => undefined);

export function MaskotSurya() {
  const { jeda, kurangi } = useGerakBrand();
  const akar = useRef<HTMLDivElement>(null);
  const badan = useRef<HTMLImageElement>(null);
  const jangkar = useRef<(HTMLSpanElement | null)[]>([]);
  const bola = useRef<(HTMLImageElement | null)[]>([]);
  const [siap, setSiap] = useState(false);

  useEffect(() => {
    // Citra dari cache bisa selesai sebelum hidrasi, sebelum onLoad terpasang.
    const img = badan.current;
    if (img?.complete) siapDilukis(img).then(() => setSiap(true));
  }, []);

  useEffect(() => {
    const kondisi: Sumbu[] = MATA.map(() => ({ x: 0, y: 0, vx: 0, vy: 0, tx: 0, ty: 0 }));
    const terapkan = (i: number) => {
      const el = bola.current[i];
      const k = kondisi[i];
      if (!el) return;
      const sx = 1 - PIPIH * Math.abs(k.x);
      const sy = 1 - PIPIH * Math.abs(k.y);
      el.style.transform = `translate3d(${(k.x * 100).toFixed(2)}%, ${(k.y * 100).toFixed(2)}%, 0) scale(${sx.toFixed(4)}, ${sy.toFixed(4)})`;
    };

    if (jeda || kurangi) {
      kondisi.forEach((_, i) => terapkan(i));
      return;
    }

    let penunjuk: { x: number; y: number } | null = null;
    let bingkai = 0;
    let waktu = 0;
    let terlihat = true;
    let lepas = 0;

    const sasaran = () => {
      MATA.forEach((_, i) => {
        const k = kondisi[i];
        const el = jangkar.current[i];
        if (!penunjuk || !el) { k.tx = 0; k.ty = 0; return; }
        const r = el.getBoundingClientRect();
        const dx = penunjuk.x - (r.left + r.width / 2);
        const dy = penunjuk.y - (r.top + r.height / 2);
        const d = Math.hypot(dx, dy);
        if (d < 1) { k.tx = 0; k.ty = 0; return; }
        const besar = 1 - Math.exp(-d / JARAK_R);
        k.tx = (dx / d) * besar * GESER_X;
        k.ty = (dy / d) * besar * GESER_Y;
      });
    };

    const langkah = (sekarang: number) => {
      const dt = Math.min(waktu ? (sekarang - waktu) / 1000 : 1 / 60, 0.1);
      waktu = sekarang;
      sasaran();
      let tenang = true;
      kondisi.forEach((k, i) => {
        const [ex, vx] = pegas(k.x - k.tx, k.vx, dt);
        const [ey, vy] = pegas(k.y - k.ty, k.vy, dt);
        k.x = k.tx + ex;
        k.y = k.ty + ey;
        k.vx = vx;
        k.vy = vy;
        if (Math.abs(k.tx - k.x) > 1e-4 || Math.abs(k.ty - k.y) > 1e-4 || Math.abs(k.vx) > 1e-3 || Math.abs(k.vy) > 1e-3) tenang = false;
        terapkan(i);
      });
      bingkai = tenang ? 0 : requestAnimationFrame(langkah);
      if (!bingkai) waktu = 0;
    };

    const minta = () => {
      if (!bingkai && terlihat && !document.hidden) bingkai = requestAnimationFrame(langkah);
    };
    const ikuti = (event: PointerEvent) => {
      window.clearTimeout(lepas);
      penunjuk = { x: event.clientX, y: event.clientY };
      minta();
    };
    const sentuh = (event: PointerEvent) => {
      if (event.pointerType === "mouse") return;
      ikuti(event);
    };
    const lepaskan = () => {
      penunjuk = null;
      minta();
    };
    const selesaiSentuh = (event: PointerEvent) => {
      if (event.pointerType === "mouse") return;
      window.clearTimeout(lepas);
      lepas = window.setTimeout(lepaskan, LEPAS_SENTUH_MS);
    };
    // Gulir menggeser wajah terhadap penunjuk yang diam; arah pandang dihitung ulang.
    const gulir = () => { if (penunjuk) minta(); };
    const keluar = (event: PointerEvent) => {
      if (event.pointerType === "mouse" && !event.relatedTarget) lepaskan();
    };
    const pengamat = new IntersectionObserver(([entry]) => {
      terlihat = entry.isIntersecting;
      if (terlihat) minta();
    });
    if (akar.current) pengamat.observe(akar.current);

    window.addEventListener("pointermove", ikuti, { passive: true });
    window.addEventListener("pointerdown", sentuh, { passive: true });
    window.addEventListener("pointerup", selesaiSentuh, { passive: true });
    window.addEventListener("pointercancel", selesaiSentuh, { passive: true });
    document.documentElement.addEventListener("pointerout", keluar);
    window.addEventListener("blur", lepaskan);
    window.addEventListener("scroll", gulir, { passive: true });
    document.addEventListener("visibilitychange", minta);
    return () => {
      pengamat.disconnect();
      window.removeEventListener("pointermove", ikuti);
      window.removeEventListener("pointerdown", sentuh);
      window.removeEventListener("pointerup", selesaiSentuh);
      window.removeEventListener("pointercancel", selesaiSentuh);
      document.documentElement.removeEventListener("pointerout", keluar);
      window.removeEventListener("blur", lepaskan);
      window.removeEventListener("scroll", gulir);
      document.removeEventListener("visibilitychange", minta);
      window.clearTimeout(lepas);
      cancelAnimationFrame(bingkai);
      kondisi.forEach((k) => { k.x = 0; k.y = 0; });
      kondisi.forEach((_, i) => terapkan(i));
    };
  }, [jeda, kurangi]);

  return (
    <div ref={akar} className={s.tubuhMascot} data-badan={siap ? "siap" : "memuat"}>
      <Image
        ref={badan}
        className={s.mascotHero}
        src="/brand/surya-mascot-v4-badan.webp"
        width={KANVAS}
        height={KANVAS}
        sizes="(max-width: 640px) 300px, 460px"
        alt="Surya, maskot berbentuk atap dengan warna amber."
        priority
        unoptimized
        onLoad={(event) => siapDilukis(event.currentTarget).then(() => setSiap(true))}
      />
      {MATA.map((mata, i) => (
        <span
          key={mata.sisi}
          ref={(el) => { jangkar.current[i] = el; }}
          className={s.mataMascot}
          style={{ left: persen(mata.x), top: persen(mata.y), width: persen(mata.w), height: persen(mata.h) }}
          aria-hidden="true"
        >
          <Image
            ref={(el) => { bola.current[i] = el; }}
            src={mata.src}
            width={mata.w}
            height={mata.h}
            alt=""
            draggable={false}
            priority
            unoptimized
          />
        </span>
      ))}
    </div>
  );
}
