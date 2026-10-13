import type { ReactNode } from "react";
import { BandingLapisan, DaftarData, Lencana, PanelLipat, TombolSalin, m2, rupiah } from "@petasurya/ui";
import bangunanKampus from "../../../../../data/fixtures/bangunan/kampus-fh-unib.json";
import { kampus, toko } from "../_data";
import { Bagian, Kode, Pelat } from "./Lembar";
import { DemoPilihanKartu } from "./DemoPilihanKartu";
import s from "./kreatifDesain.module.css";

/** Kedua lapisan memakai proyeksi dan bingkai sama agar pembanding tidak bergeser. */
function LapisanAtap({ mask }: { mask: boolean }) {
  const jejak = bangunanKampus.geom.coordinates;
  const geometri = kampus.analisis.mask_geojson;
  const poligon = geometri?.coordinates ?? [];
  const titik = [...jejak.flat(), ...poligon.flat(2)];
  const minLon = Math.min(...titik.map((p) => p[0]));
  const maxLon = Math.max(...titik.map((p) => p[0]));
  const minLat = Math.min(...titik.map((p) => p[1]));
  const maxLat = Math.max(...titik.map((p) => p[1]));
  const koreksi = Math.cos(((minLat + maxLat) / 2) * Math.PI / 180);
  const skala = Math.min(360 / ((maxLon - minLon) * koreksi), 210 / (maxLat - minLat));
  const x = (lon: number) => 200 + (lon - (minLon + maxLon) / 2) * koreksi * skala;
  const y = (lat: number) => 125 - (lat - (minLat + maxLat) / 2) * skala;
  const d = (cincin: number[][][]) => cincin.map((c) => c.map((p, i) => `${i ? "L" : "M"}${x(p[0]).toFixed(2)},${y(p[1]).toFixed(2)}`).join(" ") + "Z").join(" ");
  return (
    <svg viewBox="0 0 400 250" className={s.plot} aria-hidden="true">
      <path className={s.kisi} d="M0 50H400M0 100H400M0 150H400M0 200H400M50 0V250M100 0V250M150 0V250M200 0V250M250 0V250M300 0V250M350 0V250" />
      <path className={s.jejak} d={d(jejak)} fillRule="evenodd" />
      {mask && poligon.map((p, i) => <path key={i} className={s.mask} d={d(p)} fillRule="evenodd" />)}
    </svg>
  );
}

function Sumber({ children }: { children: ReactNode }) {
  return <p className={s.sumber}>{children}</p>;
}

export function BagianKreatif() {
  const salinan = `${toko.bangunan.nama} · ${toko.bangunan.source_ref}\nHemat tahun pertama: ${rupiah(toko.simulasi.savings_idr_yr1)}\nContoh perhitungan PetaSurya`;
  return (
    <Bagian id="kreatif" nomor="09" judul="Komponen kreatif"
      aturan="Adaptasi Arc untuk membandingkan lapisan, membuka rincian, memilih, dan menyalin. Coba kontrol di bawah.">
      <Pelat nomor="9.1" judul="Pembanding lapisan"
        keterangan="Fakultas Hukum UNIB · contoh tersimpan. Geser batas dengan sentuhan atau panah keyboard; geometri dari OSM dan hasil segmentasi.">
        <BandingLapisan sebelum={<LapisanAtap mask={false} />} sesudah={<LapisanAtap mask />}
          labelSebelum="Jejak OSM" labelSesudah="Mask atap" />
        <Sumber><Kode>BandingLapisan</Kode> · adaptasi ImageCompare</Sumber>
      </Pelat>

      <Pelat nomor="9.2" judul="Panel lipat" keterangan="Rincian dibuka di tempat. Escape melipat dan mengembalikan fokus ke pemicu.">
        <PanelLipat judul="Luas atap · Fakultas Hukum UNIB" ringkasan={<>{m2(kampus.analisis.roof_area_m2)} <Lencana contoh>Contoh</Lencana></>}>
          <DaftarData baris={[
            { label: "Luas atap", nilai: m2(kampus.analisis.roof_area_m2) },
            { label: "Luas efektif", nilai: m2(kampus.analisis.usable_area_m2) },
          ]} />
          <p className={s.catatan}>Cadangan area 15% adalah asumsi. Halangan dan bayangan belum diukur.</p>
        </PanelLipat>
        <Sumber><Kode>PanelLipat</Kode> · adaptasi ExpandableCard</Sumber>
      </Pelat>

      <Pelat nomor="9.3" judul="Pilihan kartu" keterangan="Pilihan tunggal dengan rincian. Radio asli mendukung Tab, panah, dan formulir.">
        <DemoPilihanKartu />
        <Sumber><Kode>PilihanKartu</Kode> · adaptasi RadioCards</Sumber>
      </Pelat>

      <Pelat nomor="9.4" judul="Salin dengan konfirmasi" keterangan="Label berganti tanpa mengubah lebar tombol. Keberhasilan dan kegagalan dibacakan pembaca layar.">
        <div className={s.contohSalin}>
          <p className={s.catatan}>{toko.bangunan.nama} · hemat {rupiah(toko.simulasi.savings_idr_yr1, true)} per tahun <Lencana contoh>Contoh</Lencana></p>
          <TombolSalin nilai={salinan} label="Salin ringkasan" />
        </div>
        <Sumber><Kode>TombolSalin</Kode> · adaptasi CopyButton</Sumber>
      </Pelat>
    </Bagian>
  );
}
