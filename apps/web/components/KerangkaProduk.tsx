import type { ReactNode } from "react";
import contohSimulasi from "../../../data/fixtures/simulasi/contoh-3f8c.json";
import { Footer } from "./Footer";
import { Header } from "./Header";
import s from "./kerangkaProduk.module.css";

/** Bingkai ruang kerja: header bersama, isi halaman, dan footer versi hitungan. */
export function KerangkaProduk({ children }: { children: ReactNode }) {
  return (
    <>
      <a className={s.lewati} href="#isi">Lewati ke isi</a>
      <Header />
      <div id="isi" className={s.isi} tabIndex={-1}>{children}</div>
      <Footer engineVersion={contohSimulasi.engine_version} />
    </>
  );
}
