"use client";

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

const KUNCI_TEMA = "petasurya-theme";

type PilihanTema = "light" | "dark" | "system";
export type TemaTerpilih = "light" | "dark";

type KonteksTema = {
  pilihan: PilihanTema;
  terpilih: TemaTerpilih;
  siap: boolean;
  setPilihan: (tema: Exclude<PilihanTema, "system">) => void;
};

const TemaContext = createContext<KonteksTema | null>(null);

function temaSistem(): TemaTerpilih {
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

export function PenyediaTema({ children }: { children: ReactNode }) {
  const [pilihan, setPilihanState] = useState<PilihanTema>("system");
  const [terpilih, setTerpilih] = useState<TemaTerpilih>("light");
  const [siap, setSiap] = useState(false);

  useEffect(() => {
    const tersimpan = window.localStorage.getItem(KUNCI_TEMA);
    const awal: PilihanTema = tersimpan === "light" || tersimpan === "dark" ? tersimpan : "system";
    setPilihanState(awal);
    setTerpilih(awal === "system" ? temaSistem() : awal);
    setSiap(true);

    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const saatSistemBerubah = () => {
      if (awal === "system") setTerpilih(media.matches ? "dark" : "light");
    };
    media.addEventListener("change", saatSistemBerubah);
    return () => media.removeEventListener("change", saatSistemBerubah);
  }, []);

  useEffect(() => {
    if (pilihan === "system") {
      document.documentElement.removeAttribute("data-theme");
      return;
    }
    document.documentElement.dataset.theme = pilihan;
  }, [pilihan]);

  const nilai = useMemo<KonteksTema>(
    () => ({
      pilihan,
      terpilih,
      siap,
      setPilihan: (tema) => {
        window.localStorage.setItem(KUNCI_TEMA, tema);
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
