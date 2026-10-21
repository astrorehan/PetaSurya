"use client";

import { useState } from "react";
import { PilihanKartu } from "@petasurya/ui";
import s from "./kreatifDesain.module.css";

export function DemoPilihanKartu() {
  const [nilai, setNilai] = useState("jejak");
  return <>
    <PilihanKartu label="Lapisan atap" nama="contoh-lapisan" nilai={nilai} onUbah={setNilai}
      pilihan={[
        { nilai: "jejak", label: "Jejak OSM", rincian: "Batas bangunan dari OpenStreetMap" },
        { nilai: "mask", label: "Mask atap", rincian: "Kontur hasil segmentasi tersimpan" },
        { nilai: "bayangan", label: "Bayangan", nonaktif: true, alasan: "Belum diukur" },
      ]} />
    <p className={s.catatan} role="status">Terpilih: {nilai === "jejak" ? "Jejak OSM" : "Mask atap"}</p>
  </>;
}
