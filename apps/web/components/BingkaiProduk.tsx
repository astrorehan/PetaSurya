"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { Header } from "./Header";
import { Footer } from "./Footer";
import s from "../app/layout.module.css";

export function BingkaiProduk({
  children,
  engineVersion,
}: {
  children: ReactNode;
  engineVersion: string;
}) {
  const pathname = usePathname();
  if (pathname === "/") return children;

  return (
    <>
      <a className={s.lewati} href="#isi">Lewati ke isi</a>
      <Header pencarian={pathname !== "/peta"} />
      <div id="isi" className={s.isi} tabIndex={-1}>{children}</div>
      <Footer engineVersion={engineVersion} />
    </>
  );
}
