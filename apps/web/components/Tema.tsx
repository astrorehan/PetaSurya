"use client";

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

const KUNCI_TEMA = "petasurya-theme";

type PilihanTema = "light" | "dark";
export type TemaTerpilih = "light" | "dark";

type KonteksTema = {
  pilihan: PilihanTema;
  terpilih: TemaTerpilih;
  siap: boolean;
  setPilihan: (tema: PilihanTema) => void;
};

const TemaContext = createContext<KonteksTema | null>(null);

export function PenyediaTema({ children }: { children: ReactNode }) {
  const [pilihan, setPilihanState] = useState<PilihanTema>("dark");
  const [terpilih, setTerpilih] = useState<TemaTerpilih>("dark");
  const [siap, setSiap] = useState(false);

  useEffect(() => {
    let tersimpan: string | null = null;
    try { tersimpan = window.localStorage.getItem(KUNCI_TEMA); } catch { /* Pilihan tetap bisa dipakai tanpa penyimpanan browser. */ }
    const awal: PilihanTema = tersimpan === "light" ? "light" : "dark";
    setPilihanState(awal);
    setTerpilih(awal);
    setSiap(true);

  }, []);

  useEffect(() => {
    if (!siap) return;
    document.documentElement.dataset.theme = pilihan;
  }, [pilihan, siap]);

  const nilai = useMemo<KonteksTema>(
    () => ({
      pilihan,
      terpilih,
      siap,
      setPilihan: (tema) => {
        try { window.localStorage.setItem(KUNCI_TEMA, tema); } catch { /* Tema berlaku pada halaman meski penyimpanan ditolak. */ }
        setPilihanState(tema);
        setTerpilih(tema);
      },
    }),
    [pilihan, terpilih, siap],
  );

  return <TemaContext.Provider value={nilai}>{children}</TemaContext.Provider>;
}

export function useTema(): KonteksTema {
  const konteks = useContext(TemaContext);
  if (!konteks) throw new Error("useTema harus dipakai di dalam PenyediaTema");
  return konteks;
}
