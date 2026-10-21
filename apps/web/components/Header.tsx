"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef, useState, type ReactNode } from "react";
import { BookOpen, ChartNoAxesCombined, ChevronDown, Database, MapPin, Menu, Moon, Search, ScanLine, Sun } from "lucide-react";
import { Ikon, Logo, Tombol } from "@petasurya/ui";
import { useTema } from "./Tema";
import s from "./chrome.module.css";

const NAVIGASI = [
  { href: "/peta", label: "Peta", ikon: MapPin },
  { href: "/kota/1771", label: "Mode Kota", ikon: ChartNoAxesCombined },
  { href: "/pindai", label: "Pindai atap", ikon: ScanLine },
  { href: "/metodologi", label: "Metodologi", ikon: BookOpen },
  { href: "/sumber-data", label: "Sumber data", ikon: Database },
];

function FormCari({ query = "" }: { query?: string }) {
  return (
    <form className={s.formCari} role="search" action="/peta" method="get">
      <Ikon ikon={Search} />
      <label className={s.srOnly} htmlFor="cari-alamat">Cari nama atau ID bangunan</label>
      <input key={query} id="cari-alamat" name="q" type="search" placeholder="Cari bangunan…" defaultValue={query} aria-keyshortcuts="/" enterKeyHint="search" />
      <kbd aria-hidden="true">/</kbd>
    </form>
  );
}

function CariBangunan() {
  const params = useSearchParams();
  return <FormCari query={params.get("q") ?? ""} />;
}

/** `pencarian` bawaan: tampil di semua halaman produk kecuali /peta, yang punya kolom cari sendiri. */
export function Header({ pencarian, tambahan }: { pencarian?: boolean; tambahan?: ReactNode }) {
  const { terpilih, setPilihan } = useTema();
  const gelap = terpilih === "dark";
  const pathname = usePathname();
  const tampilCari = pencarian ?? pathname !== "/peta";
  const headerRef = useRef<HTMLElement>(null);
  const menuRef = useRef<HTMLButtonElement>(null);
  const rapatRef = useRef(false);
  const [rapat, setRapat] = useState(false);
  const [sorot, setSorot] = useState(false);
  const [fokus, setFokus] = useState(false);
  const [disematkan, setDisematkan] = useState(false);
  const [menuBuka, setMenuBuka] = useState(false);
  const terbuka = !rapat || sorot || fokus || disematkan || menuBuka;
  const aktif = NAVIGASI.find(({ href }) => pathname === href)
    ?? (pathname.startsWith("/atap/") ? { label: "Hasil atap", ikon: ChartNoAxesCombined }
      : pathname.startsWith("/kota/") ? { label: "Mode kota", ikon: MapPin }
        : { label: "Beranda", ikon: Sun });
  const IkonAktif = aktif.ikon;
  const saatIni = (href: string) => pathname === href || (href === "/pindai" && pathname.startsWith("/atap/"));

  useEffect(() => {
    let bingkai = 0;
    const perbarui = () => {
      const berikut = window.scrollY > (rapatRef.current ? 24 : 80);
      if (berikut !== rapatRef.current) {
        rapatRef.current = berikut;
        setRapat(berikut);
      }
      bingkai = 0;
    };
    const gulir = () => { if (!bingkai) bingkai = requestAnimationFrame(perbarui); };
    const klikLuar = (event: PointerEvent) => {
      if (headerRef.current?.contains(event.target as Node)) return;
      setDisematkan(false);
      setMenuBuka(false);
      setFokus(false);
    };
    const pintasanCari = (event: KeyboardEvent) => {
      if (event.key !== "/" || event.ctrlKey || event.metaKey || event.altKey || event.defaultPrevented) return;
      if (event.target instanceof Element && event.target.closest("input, textarea, select, [contenteditable='true']")) return;
      const kolom = document.querySelector<HTMLInputElement>("#cari-katalog, #cari-alamat");
      if (!kolom) return;
      event.preventDefault();
      setDisematkan(true);
      requestAnimationFrame(() => kolom.focus());
    };
    perbarui();
    window.addEventListener("scroll", gulir, { passive: true });
    document.addEventListener("pointerdown", klikLuar);
    document.addEventListener("keydown", pintasanCari);
    return () => {
      window.removeEventListener("scroll", gulir);
      document.removeEventListener("pointerdown", klikLuar);
      document.removeEventListener("keydown", pintasanCari);
      cancelAnimationFrame(bingkai);
    };
  }, []);

  useEffect(() => {
    setMenuBuka(false);
    setDisematkan(false);
    setFokus(false);
    setSorot(false);
  }, [pathname]);

  function tutupMenu() {
    setMenuBuka(false);
    setDisematkan(false);
  }

  function bukaNavigasi() {
    setDisematkan(true);
    if (window.matchMedia("(max-width: 1040px)").matches) setMenuBuka(true);
    else requestAnimationFrame(() => headerRef.current?.querySelector<HTMLAnchorElement>("nav a[aria-current], nav a")?.focus());
  }

  return (
    <header
      ref={headerRef}
      className={s.header}
      data-rapat={rapat}
      data-terbuka={terbuka}
      data-pencarian={tampilCari}
      onFocusCapture={() => setFokus(true)}
      onBlurCapture={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) setFokus(false); }}
      onKeyDown={(event) => {
        if (event.key !== "Escape") return;
        tutupMenu();
        if (menuBuka) menuRef.current?.focus();
        else { (document.activeElement as HTMLElement)?.blur(); setFokus(false); }
      }}
    >
      <div
        className={s.headerDalam}
        onPointerEnter={(event) => { if (event.pointerType === "mouse") setSorot(true); }}
        onPointerLeave={() => setSorot(false)}
      >
        <Link className={s.merek} href="/" aria-label="PetaSurya, beranda" onClick={tutupMenu}>
          <Logo size={32} label="" />
          <span className={s.wordmark}>PetaSurya<span className={s.titikMerek}>.</span></span>
        </Link>
        <span className={s.konteks} aria-hidden="true"><IkonAktif size={14} /><span>{aktif.label}</span></span>

        <div id="area-navigasi" className={s.zonaNavigasi} inert={!terbuka} aria-hidden={!terbuka}>
          <nav className={s.nav} aria-label="Navigasi utama">
            {NAVIGASI.map(({ href, label }) => (
              <Link key={href} href={href} onClick={tutupMenu} aria-current={saatIni(href) ? "page" : undefined}>{label}</Link>
            ))}
          </nav>
          <div className={s.sisiKanan}>
            {tampilCari && <Suspense fallback={<FormCari />}><CariBangunan /></Suspense>}
            <div className={s.aksiHeader}>
              <button ref={menuRef} className={s.tombolMenu} type="button" onClick={() => setMenuBuka((nilai) => !nilai)} aria-label="Menu utama" aria-expanded={menuBuka} aria-controls="menu-produk">
                <Menu size={18} aria-hidden="true" />
              </button>
              {tambahan}
              <Tombol className={s.tombolTema} ikon={gelap ? Sun : Moon} hanyaIkon onClick={() => setPilihan(gelap ? "light" : "dark")} title={"Tema " + (gelap ? "terang" : "gelap")}>
                {"Gunakan tema " + (gelap ? "terang" : "gelap")}
              </Tombol>
            </div>
          </div>
        </div>
        <button className={s.bukaNavigasi} type="button" aria-label="Buka navigasi" aria-expanded={terbuka} aria-controls="area-navigasi" onClick={bukaNavigasi}>
          <ChevronDown size={17} aria-hidden="true" />
        </button>
      </div>
      <nav id="menu-produk" className={s.menuIsi} aria-label="Navigasi ponsel" hidden={!menuBuka}>
        {NAVIGASI.map(({ href, label, ikon: IkonNav }) => (
          <Link key={href} href={href} onClick={tutupMenu} aria-current={saatIni(href) ? "page" : undefined}><IkonNav size={16} aria-hidden="true" />{label}</Link>
        ))}
      </nav>
    </header>
  );
}
