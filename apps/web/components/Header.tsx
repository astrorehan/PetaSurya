"use client";

import Link from "next/link";
import { Moon, Search, Sun } from "lucide-react";
import { Logo } from "@petasurya/ui";
import { useTema } from "./Tema";
import s from "./chrome.module.css";

export function Header() {
  const { terpilih, setPilihan } = useTema();
  const gelap = terpilih === "dark";
  const tujuanTema = gelap ? "light" : "dark";

  return (
    <header className={s.header}>
      <div className={s.headerDalam}>
        <Link className={s.merek} href="/" aria-label="PetaSurya, beranda">
          <Logo size={32} label="" />
          <span className={s.wordmark}>PetaSurya</span>
        </Link>

        <form className={s.formCari} role="search" action="/" method="get">
          <Search size={17} aria-hidden="true" />
          <label className={s.srOnly} htmlFor="cari-alamat">
            Cari alamat atau bangunan
          </label>
          <input id="cari-alamat" name="q" placeholder="Cari alamat atau bangunan" />
        </form>

        <nav className={s.nav} aria-label="Navigasi utama">
          <Link href="/metodologi">Metodologi</Link>
          <Link href="/sumber-data">Sumber data</Link>
        </nav>

        <button
          className={s.tombolTema}
          type="button"
          onClick={() => setPilihan(tujuanTema)}
          aria-label={`Gunakan tema ${gelap ? "terang" : "gelap"}`}
          title={`Tema ${gelap ? "terang" : "gelap"}`}
        >
          {gelap ? <Sun size={17} aria-hidden="true" /> : <Moon size={17} aria-hidden="true" />}
          <span className={s.tombolTemaTeks}>{gelap ? "Terang" : "Gelap"}</span>
        </button>
      </div>
    </header>
  );
}
