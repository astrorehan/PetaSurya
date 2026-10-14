"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { Suspense, useRef } from "react";
import { Menu, Moon, Search, Sun } from "lucide-react";
import { Ikon, Logo, Tombol } from "@petasurya/ui";
import { useTema } from "./Tema";
import s from "./chrome.module.css";

const NAVIGASI = [
  { href: "/peta", label: "Peta" },
  { href: "/pindai", label: "Pindai atap" },
  { href: "/metodologi", label: "Metodologi" },
  { href: "/sumber-data", label: "Sumber data" },
];

function FormCari({ query = "" }: { query?: string }) {
  return (
    <form className={s.formCari} role="search" action="/peta" method="get">
      <Ikon ikon={Search} />
      <label className={s.srOnly} htmlFor="cari-alamat">Cari nama atau ID bangunan</label>
      <input key={query} id="cari-alamat" name="q" type="search" placeholder="Cari nama atau ID bangunan" defaultValue={query} />
    </form>
  );
}

function CariBangunan() {
  const params = useSearchParams();
  return <FormCari query={params.get("q") ?? ""} />;
}

export function Header() {
  const { terpilih, setPilihan } = useTema();
  const gelap = terpilih === "dark";
  const tujuanTema = gelap ? "light" : "dark";
  const pathname = usePathname();
  const menuRef = useRef<HTMLDetailsElement>(null);

  const tutupMenu = () => {
    if (menuRef.current) menuRef.current.open = false;
  };

  return (
    <header className={s.header}>
      <div className={s.headerDalam}>
        <Link className={s.merek} href="/" aria-label="PetaSurya, beranda" onClick={tutupMenu}>
          <Logo size={32} label="" />
          <span className={s.wordmark}>PetaSurya</span>
        </Link>

        <nav className={s.nav} aria-label="Navigasi utama">
          {NAVIGASI.map(({ href, label }) => (
            <Link key={href} href={href} aria-current={pathname === href || (href === "/pindai" && pathname.startsWith("/atap/")) ? "page" : undefined}>{label}</Link>
          ))}
        </nav>

        <Suspense fallback={<FormCari />}><CariBangunan /></Suspense>

        <details
          ref={menuRef}
          className={s.menu}
          onKeyDown={(event) => {
            if (event.key === "Escape" && menuRef.current?.open) {
              tutupMenu();
              menuRef.current.querySelector("summary")?.focus();
            }
          }}
        >
          <summary aria-label="Menu utama" title="Menu utama"><Ikon ikon={Menu} ukuran={20} /></summary>
          <nav className={s.menuIsi} aria-label="Navigasi ponsel">
            {NAVIGASI.map(({ href, label }) => (
              <Link key={href} href={href} onClick={tutupMenu} aria-current={pathname === href ? "page" : undefined}>{label}</Link>
            ))}
          </nav>
        </details>

        <Tombol
          className={s.tombolTema}
          ikon={gelap ? Sun : Moon}
          hanyaIkon
          onClick={() => setPilihan(tujuanTema)}
          title={`Tema ${gelap ? "terang" : "gelap"}`}
        >
          {`Gunakan tema ${gelap ? "terang" : "gelap"}`}
        </Tombol>
      </div>
    </header>
  );
}
