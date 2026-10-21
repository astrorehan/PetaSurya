"use client";

import { useState } from "react";
import { Angka, DaftarData, MeterPayback, Segmen } from "@petasurya/ui";
import s from "./angkaDesain.module.css";

type Keadaan = "hasil" | "menghitung";

/*
 * Peragaan keadaan hitung ulang. Tidak memanggil mesin: pengalih hanya
 * memasang `menghitung` pada komponen yang sama dengan layar hasil atap.
 */
export function DemoHitungUlang({
  hemat,
  hematLengkap,
  payback,
  rincian,
}: {
  hemat: string;
  hematLengkap: string;
  payback: number | null;
  rincian: { label: string; nilai: string }[];
}) {
  const [keadaan, setKeadaan] = useState<Keadaan>("hasil");
  const menghitung = keadaan === "menghitung";

  return (
    <div className={s.demo}>
      <Segmen
        label="Keadaan panel"
        nama="peragaan-hitung-ulang"
        pilihan={[
          { nilai: "hasil", label: "Hasil" },
          { nilai: "menghitung", label: "Menghitung ulang" },
        ]}
        nilai={keadaan}
        onUbah={setKeadaan}
      />
      <div className={s.demoPanel}>
        <Angka label="Hemat per tahun" aksen="daun" nilai={hemat} lengkap={hematLengkap} menghitung={menghitung} />
        <MeterPayback tahun={payback} menghitung={menghitung} />
        <DaftarData baris={rincian} menghitung={menghitung} />
        <p className={s.status} role="status">
          {menghitung ? "Menghitung ulang dengan asumsi baru…" : ""}
        </p>
      </div>
    </div>
  );
}
