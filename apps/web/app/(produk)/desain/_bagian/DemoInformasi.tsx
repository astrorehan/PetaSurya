"use client";

import Link from "next/link";
import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { Angka, Ikon, Lencana, Segmen, kelasTautan, rupiah, tahun } from "@petasurya/ui";
import { toko } from "../_data";
import s from "./informasi.module.css";

export function DemoInformasi() {
  const [mode, setMode] = useState<"ringkas" | "berlebihan">("ringkas");
  const berlebihan = mode === "berlebihan";
  const hemat = rupiah(toko.simulasi.savings_idr_yr1, true);
  const balikModal = tahun(toko.simulasi.payback_years ?? Infinity);

  return (
    <div className={s.contoh}>
      <div className={s.kepala}>
        <h3 className={s.judul}>Informasi yang sama. Beban baca berbeda.</h3>
        <Segmen
          label="Kepadatan teks"
          nama="kepadatan-teks"
          sembunyikanLabel
          nilai={mode}
          onUbah={setMode}
          pilihan={[
            { nilai: "ringkas", label: "Ringkas" },
            { nilai: "berlebihan", label: "Berlebihan" },
          ]}
        />
      </div>

      <div className={s.panggung}>
        <div className={s.hasil}>
          <div className={s.identitas}>
            <span>{toko.bangunan.nama}</span>
            <Lencana contoh>Contoh</Lencana>
          </div>
          {berlebihan && <p className={s.penjelasan}>Di bawah ini adalah ringkasan penghematan listrik dan waktu balik modal bangunan yang dipilih.</p>}
          <Angka label="Hemat per tahun" nilai={hemat} lengkap={rupiah(toko.simulasi.savings_idr_yr1)} ukuran="display" aksen="daun" />
          {berlebihan && <p className={s.penjelasan}>Angka di atas menunjukkan penghematan sebesar {hemat} setiap tahun.</p>}
          <p className={s.balikModal}>Balik modal <strong>{balikModal}</strong></p>
          {berlebihan && <p className={s.penjelasan}>Waktu yang diperlukan untuk mengembalikan biaya pemasangan adalah {balikModal}.</p>}
          <details className={s.rincian}>
            <summary>Rincian hasil <Ikon ikon={ChevronDown} /></summary>
            <p>Hemat tahun pertama: <span className="num">{rupiah(toko.simulasi.savings_idr_yr1)}</span>. Data contoh untuk bangunan {toko.bangunan.nama}.</p>
            <Link href={`/atap/${toko.bangunan.id}`} className={kelasTautan()}>Lihat hasil dan cara hitung</Link>
          </details>
        </div>
        <p className={s.catatan} role="status">
          {berlebihan
            ? "Paragraf mengulang angka yang sudah terbaca. Pengguna harus melewatinya untuk mencapai rincian."
            : "Label dan satuan tetap terlihat. Rincian dibuka saat dibutuhkan."}
        </p>
      </div>
    </div>
  );
}
