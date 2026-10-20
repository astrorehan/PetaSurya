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

    const terjaga = () => { elemen.dataset.terjaga = String(!document.hidden); };
    terjaga();
    document.addEventListener("visibilitychange", terjaga);
    return () => {
      preferensi.removeEventListener("change", tampilkan);
      pengamat.disconnect();
      panggungTerlihat.disconnect();
      document.removeEventListener("visibilitychange", terjaga);
    };
  }, []);

  function ubah() {
    setJeda((sebelumnya) => !sebelumnya);
    akar.current?.querySelectorAll<HTMLElement>("[data-reveal]").forEach((target) => { target.dataset.terlihat = "ya"; });
  }

  return (
    <KendaliGerak.Provider value={{ jeda, kurangi, ubah }}>
      <div ref={akar} className={s.halaman} data-gerak={jeda || kurangi ? "jeda" : "jalan"}>
        {children}
      </div>
    </KendaliGerak.Provider>
  );
}

/** Status gerak landing: dijeda pengguna atau dikurangi oleh preferensi sistem. */
export function useGerakBrand() {
  const { jeda, kurangi } = useContext(KendaliGerak);
  return { jeda, kurangi };
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
