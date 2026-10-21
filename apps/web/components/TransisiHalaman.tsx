"use client";

import { useEffect, useLayoutEffect, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";

/*
 * Perpindahan halaman memakai View Transitions API: peramban memotret halaman
 * lama, router memuat tujuan, lalu kedua potret di-crossfade (transisi.css).
 * Navigasi tidak ditunda: kerangka tujuan sudah dipramuat oleh <Link>.
 * Tanpa dukungan API atau dengan reduced motion, tautan berjalan seperti biasa.
 */

/** Urutan dalam alur: pengenalan → peta → pemindai → hasil. Ke urutan lebih kecil = mundur. */
function urutan(pathname: string) {
  if (pathname === "/") return 0;
  if (pathname.startsWith("/atap/")) return 3;
  if (pathname.startsWith("/pindai")) return 2;
  return 1;
}

/**
 * Batas tunggu kerangka memuat (loading.tsx) berganti isi sebelum potret baru diambil.
 * Selama menunggu, layar menampilkan potret lama yang beku; lewat dari batas ini
 * kerangka yang dianimasikan masuk, lalu isi menggantikannya di tempat.
 */
const TUNGGU_ISI_MS = 200;
/** Navigasi yang tak kunjung selesai tetap melepas transisi; potret lama tidak boleh membeku. */
const BATAS_NAVIGASI_MS = 1600;

function tungguIsi(batas: number) {
  return new Promise<void>((selesai) => {
    const siap = () => !document.querySelector("[data-memuat-rute]");
    if (siap()) return selesai();
    const pengamat = new MutationObserver(() => { if (siap()) akhiri(); });
    const jadwal = setTimeout(() => akhiri(), batas);
    function akhiri() { pengamat.disconnect(); clearTimeout(jadwal); selesai(); }
    pengamat.observe(document.body, { childList: true, subtree: true });
  });
}

export function TransisiHalaman() {
  const router = useRouter();
  const pathname = usePathname();
  const tiba = useRef<{ pathname: string; selesai: () => void } | null>(null);
  const berjalan = useRef<ViewTransition | null>(null);

  // Efek tata letak berjalan pada commit yang sama dengan DOM tujuan, sebelum peramban melukis.
  useLayoutEffect(() => {
    if (tiba.current?.pathname !== pathname) return;
    tiba.current.selesai();
    tiba.current = null;
  }, [pathname]);

  useEffect(() => {
    function klik(event: MouseEvent) {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      if (typeof document.startViewTransition !== "function" || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
      const tautan = event.target instanceof Element ? event.target.closest("a[href]") : null;
      if (!(tautan instanceof HTMLAnchorElement) || tautan.hasAttribute("download") || (tautan.target && tautan.target !== "_self")) return;
      if (tautan.dataset.transisi === "tidak") return;
      const url = new URL(tautan.href, window.location.href);
      if (url.origin !== window.location.origin || url.pathname === window.location.pathname) return;

      event.preventDefault();
      berjalan.current?.skipTransition();
      const akar = document.documentElement;
      akar.dataset.arahTransisi = urutan(url.pathname) < urutan(window.location.pathname) ? "mundur" : "maju";
      // Kapsul ringkas (halaman sudah digulir) akan menjadi header penuh di tujuan: isinya berbeda.
      if (document.querySelector('header[data-rapat="true"][data-terbuka="false"]')) akar.dataset.kepalaTransisi = "berubah";
      else delete akar.dataset.kepalaTransisi;
      const tujuan = url.pathname + url.search + url.hash;
      const transisi = document.startViewTransition(() => new Promise<void>((selesai) => {
        const batas = setTimeout(() => { tiba.current = null; selesai(); }, BATAS_NAVIGASI_MS);
        tiba.current = {
          pathname: url.pathname,
          selesai: () => { clearTimeout(batas); void tungguIsi(TUNGGU_ISI_MS).then(selesai); },
        };
        router.push(tujuan);
      }));
      berjalan.current = transisi;
      transisi.finished.finally(() => {
        if (berjalan.current !== transisi) return;
        berjalan.current = null;
        delete akar.dataset.arahTransisi;
        delete akar.dataset.kepalaTransisi;
        // Tautan yang diklik sudah hilang dari DOM: pindahkan fokus ke judul tujuan.
        if (document.activeElement && document.activeElement !== document.body) return;
        const judul = document.querySelector<HTMLElement>("main h1, h1");
        if (!judul) return;
        if (!judul.hasAttribute("tabindex")) judul.setAttribute("tabindex", "-1");
        judul.focus({ preventScroll: true });
      });
    }
    document.addEventListener("click", klik, true);
    return () => document.removeEventListener("click", klik, true);
  }, [router]);

  return null;
}
