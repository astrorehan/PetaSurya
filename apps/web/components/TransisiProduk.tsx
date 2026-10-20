"use client";

import { startTransition, useCallback, useEffect, useRef, useState, type CSSProperties, type MouseEvent, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { ArrowUpRight, MapPin, Sun, X } from "lucide-react";
import { Logo } from "@petasurya/ui";
import { JejakKawasan } from "./JejakKawasan";
import s from "./transisiProduk.module.css";

type Perjalanan = {
  href: string;
  pathname: string;
  peta: boolean;
  x: number;
  y: number;
  mulai: number;
  minimum: number;
  durasiBuka: number;
};

function tujuanProduk(target: EventTarget | null) {
  if (!(target instanceof Element)) return null;
  if (target.closest("[data-lapisan-transisi]")) return null;
  const tautan = target.closest<HTMLAnchorElement>("a[href]");
  if (!tautan || tautan.hasAttribute("download") || (tautan.target && tautan.target !== "_self")) return null;
  const url = new URL(tautan.href, window.location.href);
  if (url.origin !== window.location.origin || !/^\/(peta|pindai)(\/|$)|^\/atap\//.test(url.pathname)) return null;
  return { tautan, url };
}

function durasi(token: string, fallback: number) {
  const nilai = getComputedStyle(document.documentElement).getPropertyValue(token).trim();
  return nilai.endsWith("ms") ? parseFloat(nilai) || fallback : nilai.endsWith("s") ? parseFloat(nilai) * 1000 || fallback : fallback;
}

export function TransisiProduk({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [perjalanan, setPerjalanan] = useState<Perjalanan | null>(null);
  const [membuka, setMembuka] = useState(false);
  const [lama, setLama] = useState(false);
  const aktif = useRef(false);
  const tombolLewati = useRef<HTMLButtonElement>(null);
  const sudahDisiapkan = useRef(new Set<string>());
  const jadwalBuka = useRef<ReturnType<typeof setTimeout> | null>(null);
  const jadwalSelesai = useRef<ReturnType<typeof setTimeout> | null>(null);
  const navigasiTertunda = useRef<{ href: string; jadwal: ReturnType<typeof setTimeout> } | null>(null);
  const fokusTujuan = useRef<string | null>(null);

  const selesai = useCallback(() => {
    if (jadwalBuka.current) clearTimeout(jadwalBuka.current);
    if (jadwalSelesai.current) clearTimeout(jadwalSelesai.current);
    if (navigasiTertunda.current) clearTimeout(navigasiTertunda.current.jadwal);
    navigasiTertunda.current = null;
    aktif.current = false;
    setPerjalanan(null);
    setMembuka(false);
    setLama(false);
  }, []);

  const lewati = useCallback(() => {
    const tujuan = navigasiTertunda.current;
    selesai();
    if (tujuan) startTransition(() => router.push(tujuan.href, { scroll: false }));
  }, [router, selesai]);

  useEffect(() => {
    if (!perjalanan) return;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    tombolLewati.current?.focus({ preventScroll: true });
    const lambat = setTimeout(() => setLama(true), 2400);
    // Navigasi yang terputus tidak boleh mengunci halaman di balik lapisan.
    const batas = setTimeout(selesai, 12000);
    const preferensi = window.matchMedia("(prefers-reduced-motion: reduce)");
    const kurangiGerak = () => { if (preferensi.matches) lewati(); };
    const tombol = (event: KeyboardEvent) => { if (event.key === "Escape") lewati(); };
    const kembali = () => { fokusTujuan.current = null; selesai(); };
    window.addEventListener("popstate", kembali);
    document.addEventListener("keydown", tombol);
    preferensi.addEventListener("change", kurangiGerak);
    return () => {
      document.body.style.overflow = overflow;
      clearTimeout(lambat);
      clearTimeout(batas);
      if (jadwalBuka.current) clearTimeout(jadwalBuka.current);
      if (jadwalSelesai.current) clearTimeout(jadwalSelesai.current);
      if (navigasiTertunda.current) clearTimeout(navigasiTertunda.current.jadwal);
      window.removeEventListener("popstate", kembali);
      document.removeEventListener("keydown", tombol);
      preferensi.removeEventListener("change", kurangiGerak);
    };
  }, [perjalanan, selesai, lewati]);

  useEffect(() => {
    if (perjalanan || pathname !== fokusTujuan.current) return;
    fokusTujuan.current = null;
    window.scrollTo({ top: 0, left: 0, behavior: "instant" });
    const bingkai = requestAnimationFrame(() => {
      const judul = document.querySelector<HTMLElement>("h1");
      judul?.setAttribute("tabindex", "-1");
      judul?.focus({ preventScroll: true });
    });
    return () => cancelAnimationFrame(bingkai);
  }, [pathname, perjalanan]);

  useEffect(() => {
    if (!perjalanan || pathname === "/") return;
    if (pathname !== perjalanan.pathname) { selesai(); return; }
    window.scrollTo({ top: 0, left: 0, behavior: "instant" });
    const target = document.querySelector<HTMLElement>("[data-tujuan-transisi]");
    const batas = target?.getBoundingClientRect();
    const lapisan = document.querySelector<HTMLElement>("[data-lapisan-transisi]");
    lapisan?.style.setProperty("--tujuan-x", batas ? `${batas.left + batas.width / 2}px` : "50vw");
    lapisan?.style.setProperty("--tujuan-y", batas ? `${batas.top + batas.height / 2}px` : "40vh");
    jadwalBuka.current = setTimeout(() => {
      setMembuka(true);
      jadwalSelesai.current = setTimeout(() => {
        selesai();
      }, perjalanan.durasiBuka);
    }, Math.max(0, perjalanan.minimum - (performance.now() - perjalanan.mulai)));
    return () => { if (jadwalBuka.current) clearTimeout(jadwalBuka.current); };
  }, [pathname, perjalanan, selesai]);

  function siapkan(target: EventTarget | null) {
    if (pathname !== "/") return;
    const tujuan = tujuanProduk(target);
    if (!tujuan) return;
    const href = tujuan.url.pathname + tujuan.url.search;
    if (sudahDisiapkan.current.has(href)) return;
    sudahDisiapkan.current.add(href);
    router.prefetch(href);
  }

  function buka(event: MouseEvent<HTMLDivElement>) {
    if (pathname !== "/" || event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    const tujuan = tujuanProduk(event.target);
    if (!tujuan) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches || tujuan.tautan.closest("[data-gerak='jeda']")) {
      fokusTujuan.current = tujuan.url.pathname;
      return;
    }
    event.preventDefault();
    event.stopPropagation();
    if (aktif.current) return;
    aktif.current = true;
    const batas = tujuan.tautan.getBoundingClientRect();
    const href = tujuan.url.pathname + tujuan.url.search + tujuan.url.hash;
    fokusTujuan.current = tujuan.url.pathname;
    router.prefetch(href);
    setMembuka(false);
    setLama(false);
    setPerjalanan({
      href,
      pathname: tujuan.url.pathname,
      peta: tujuan.url.pathname === "/peta",
      x: batas.left + batas.width / 2,
      y: batas.top + batas.height / 2,
      mulai: performance.now(),
      minimum: durasi("--t-gerbang-siap", 720),
      durasiBuka: durasi("--t-gerbang-buka", 680),
    });
    // Muat tujuan setelah lingkaran menutup agar isi baru tidak mendahului sapuan.
    navigasiTertunda.current = {
      href,
      jadwal: setTimeout(() => {
        navigasiTertunda.current = null;
        startTransition(() => router.push(href, { scroll: false }));
      }, durasi("--t-gerbang-tutup", 420)),
    };
  }

  const gaya = perjalanan ? { "--asal-x": `${perjalanan.x}px`, "--asal-y": `${perjalanan.y}px` } as CSSProperties : undefined;

  return (
    <div onClickCapture={buka} onPointerOverCapture={(event) => siapkan(event.target)} onFocusCapture={(event) => siapkan(event.target)}>
      <div className={s.isi} data-transisi={perjalanan ? membuka ? "membuka" : "menutup" : undefined} inert={Boolean(perjalanan)}>
        {children}
      </div>
      {perjalanan && (
        <div className={s.lapisan} style={gaya} data-lapisan-transisi data-membuka={membuka}>
          <div className={s.merek}><Logo size={30} label="" /><span>PetaSurya<span>.</span></span></div>
          <button ref={tombolLewati} className={s.lewati} type="button" onClick={lewati}>Lewati transisi <X size={14} aria-hidden="true" /></button>
          <div className={s.kawasan} aria-hidden="true"><JejakKawasan dekoratif /></div>
          <div className={s.pusat} aria-hidden="true">
            <div className={s.orbit} />
            <div className={s.orbitDalam} />
            <div className={s.titikOrbit} />
            <div className={s.lambang}><Sun className={s.matahari} size={34} strokeWidth={1.2} /><MapPin className={s.pin} size={34} strokeWidth={1.5} /></div>
          </div>
          <div className={s.salinan}>
            <p className={s.lokasi}><span /> BENGKULU, INDONESIA</p>
            <p className={s.judul}>Dari sini,<br /><span>ke atap Anda.</span></p>
            <p className={s.status} role="status">{lama ? "Halaman masih disiapkan…" : perjalanan.peta ? "Membuka peta Bengkulu" : "Membuka analisis atap"}<ArrowUpRight size={15} aria-hidden="true" /></p>
            {lama && <a className={s.langsung} href={perjalanan.href}>Buka halaman langsung</a>}
          </div>
          <div className={s.kaki} aria-hidden="true"><span>ATAPMU, DIHITUNG.</span><span>{perjalanan.peta ? "PETA BANGUNAN" : "ANALISIS ATAP"} <ArrowUpRight size={13} /></span></div>
        </div>
      )}
    </div>
  );
}
