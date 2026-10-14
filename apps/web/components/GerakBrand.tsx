"use client";

import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { Pause, Play } from "lucide-react";
import s from "./halamanBrand.module.css";

const KendaliGerak = createContext({ jeda: false, kurangi: false, ubah: () => {} });

export function GerakBrand({ children }: { children: ReactNode }) {
  const akar = useRef<HTMLDivElement>(null);
  const [jeda, setJeda] = useState(false);
  const [kurangi, setKurangi] = useState(false);

  useEffect(() => {
    const elemen = akar.current;
    if (!elemen) return;
    const preferensi = window.matchMedia("(prefers-reduced-motion: reduce)");
    const tampilkan = () => {
      setKurangi(preferensi.matches);
      if (preferensi.matches) {
        elemen.querySelectorAll<HTMLElement>("[data-reveal]").forEach((target) => { target.dataset.terlihat = "ya"; });
      }
    };
    tampilkan();
    preferensi.addEventListener("change", tampilkan);

    const pengamat = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        (entry.target as HTMLElement).dataset.terlihat = "ya";
        pengamat.unobserve(entry.target);
      }
    }, { threshold: 0.08, rootMargin: "0px 0px -24px 0px" });
    elemen.querySelectorAll<HTMLElement>("[data-reveal]").forEach((target) => {
      target.dataset.terlihat = preferensi.matches ? "ya" : "menunggu";
      if (!preferensi.matches) pengamat.observe(target);
    });

    const panggung = elemen.querySelector<HTMLElement>("[data-panggung]");
    const panggungTerlihat = new IntersectionObserver(([entry]) => {
      if (panggung) panggung.dataset.aktif = String(entry.isIntersecting);
    });
    if (panggung) panggungTerlihat.observe(panggung);

    let bingkai = 0;
    let x = 0;
    let y = 0;
    const gerakkan = (event: PointerEvent) => {
      if (!panggung || preferensi.matches || elemen.dataset.gerak !== "jalan" || event.pointerType !== "mouse") return;
      const batas = panggung.getBoundingClientRect();
      x = ((event.clientX - batas.left) / batas.width - 0.5) * 18;
      y = ((event.clientY - batas.top) / batas.height - 0.5) * 12;
      if (bingkai) return;
      bingkai = requestAnimationFrame(() => {
        panggung.style.setProperty("--gerak-x", `${x.toFixed(2)}px`);
        panggung.style.setProperty("--gerak-y", `${y.toFixed(2)}px`);
        bingkai = 0;
      });
    };
    const pulihkan = () => {
      cancelAnimationFrame(bingkai);
      bingkai = 0;
      panggung?.style.setProperty("--gerak-x", "0px");
      panggung?.style.setProperty("--gerak-y", "0px");
    };
    const terjaga = () => { elemen.dataset.terjaga = String(!document.hidden); };
    terjaga();
    document.addEventListener("visibilitychange", terjaga);
    panggung?.addEventListener("pointermove", gerakkan);
    panggung?.addEventListener("pointerleave", pulihkan);
    return () => {
      preferensi.removeEventListener("change", tampilkan);
      pengamat.disconnect();
      panggungTerlihat.disconnect();
      document.removeEventListener("visibilitychange", terjaga);
      panggung?.removeEventListener("pointermove", gerakkan);
      panggung?.removeEventListener("pointerleave", pulihkan);
      cancelAnimationFrame(bingkai);
    };
  }, []);

  function ubah() {
    setJeda((sebelumnya) => !sebelumnya);
    akar.current?.querySelectorAll<HTMLElement>("[data-reveal]").forEach((target) => { target.dataset.terlihat = "ya"; });
    const panggung = akar.current?.querySelector<HTMLElement>("[data-panggung]");
    panggung?.style.setProperty("--gerak-x", "0px");
    panggung?.style.setProperty("--gerak-y", "0px");
  }

  return (
    <KendaliGerak.Provider value={{ jeda, kurangi, ubah }}>
      <div ref={akar} className={s.halaman} data-theme="dark" data-gerak={jeda || kurangi ? "jeda" : "jalan"}>
        {children}
      </div>
    </KendaliGerak.Provider>
  );
}

export function KontrolGerak() {
  const { jeda, kurangi, ubah } = useContext(KendaliGerak);
  const label = jeda ? "Lanjutkan animasi" : "Jeda animasi";
  return (
    <button className={s.kontrolGerak} type="button" onClick={ubah} aria-label={label} aria-pressed={jeda} title={label} hidden={kurangi}>
      {jeda ? <Play size={14} aria-hidden="true" /> : <Pause size={14} aria-hidden="true" />}
    </button>
  );
}
