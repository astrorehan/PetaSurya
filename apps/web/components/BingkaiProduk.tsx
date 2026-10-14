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
      <Header />
      <div className={s.isi}>{children}</div>
      <Footer engineVersion={engineVersion} />
    </>
  );
}
