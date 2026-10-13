"use client";

import { Check, Copy, TriangleAlert } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Tombol } from "./Tombol";
import s from "./kreatif.module.css";

export function TombolSalin({ nilai, label = "Salin", nonaktif = false }: { nilai: string; label?: string; nonaktif?: boolean }) {
  const [status, setStatus] = useState<"siap" | "menyalin" | "tersalin" | "galat">("siap");
  const waktu = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const aktif = useRef(false);
  const sibuk = useRef(false);
  useEffect(() => {
    aktif.current = true;
    return () => { aktif.current = false; clearTimeout(waktu.current); };
  }, []);
  async function salin() {
    if (sibuk.current) return;
    sibuk.current = true;
    clearTimeout(waktu.current);
    setStatus("menyalin");
    try {
      await navigator.clipboard.writeText(nilai);
      if (aktif.current) setStatus("tersalin");
    } catch {
      if (aktif.current) setStatus("galat");
    } finally {
      sibuk.current = false;
      if (aktif.current) waktu.current = setTimeout(() => setStatus("siap"), 2400);
    }
  }
  return (
    <span className={s.salin}>
      <Tombol ikon={status === "tersalin" ? Check : status === "galat" ? TriangleAlert : Copy}
        onClick={() => void salin()} disabled={nonaktif} sibuk={status === "menyalin"}>
        <span className={s.labelSalin}>
          <span className={s.ukurSalin} aria-hidden="true">{label}</span>
          <span className={s.ukurSalin} aria-hidden="true">Tersalin</span>
          <span className={s.ukurSalin} aria-hidden="true">Coba lagi</span>
          <span key={status} className={s.teksSalin}>{status === "tersalin" ? "Tersalin" : status === "galat" ? "Coba lagi" : label}</span>
        </span>
      </Tombol>
      <span className={s.tersembunyi} role="status">{status === "tersalin" ? `${label}: tersalin ke papan klip.` : status === "galat" ? "Gagal menyalin. Periksa izin papan klip, lalu coba lagi." : ""}</span>
    </span>
  );
}
