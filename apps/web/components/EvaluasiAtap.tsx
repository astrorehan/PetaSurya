"use client";

import Link from "next/link";
import { useState } from "react";
import { Angka, DaftarData, PanelLipat } from "@petasurya/ui";
import laporanJson from "../../../data/evaluasi/laporan-final.json";
import manifest from "../../../data/evaluasi/manifest.json";
import s from "./evaluasiAtap.module.css";

type Geometri = { coordinates: number[][][][] };
type Metrik = { iou: number; galat_luas_persen: number };
type Baris = { id:number; split:string; strata:string; method:string|null; status_acuan:string; catatan_acuan:string; metrik:Metrik|null; acuan_geojson?:Geometri; prediksi_geojson?:Geometri|null; durasi_detik:number|null; galat:string|null };
type Ringkasan = { jumlah_sampel:number; berlabel:number; ambigu:number; cv_diterima:number; fallback:number; gagal_sumber:number; belum_dijalankan:number; semua:{n:number;mean_iou:number|null;median_galat_luas_persen:number|null};durasi_median_detik:number|null };
type Laporan = { model_version:string;dataset:string;catatan:string;sha256_manifest:string;sha256_anotasi:string;ringkasan:Record<string,Ringkasan>;sampel:Baris[] };
const laporan = laporanJson as Laporan;
const format = (n:number|null,d=2) => n === null ? "—" : n.toLocaleString("id-ID",{maximumFractionDigits:d});
const ringPath = (rings:number[][][]) => rings.map(r=>'M'+r.map(p=>p.join(',')).join('L')+'Z').join(' ');

export function EvaluasiAtap() {
  const [split,setSplit]=useState("uji");
  const rows=laporan.sampel.filter(b=>b.split===split);
  const [dipilih,setDipilih]=useState<number|null>(null);
  const [citraGagal,setCitraGagal]=useState<ReadonlySet<number>>(()=>new Set());
  const row=rows.find(b=>b.id===dipilih)??rows.find(b=>b.metrik)??rows[0];
  const target=manifest.sampel.find(b=>b.id===row?.id);
  const summary=laporan.ringkasan[split];
  const pixel=([lon,lat]:number[])=>{
    const f=target!.bingkai,n=256*2**f.zoom;
    return [(lon+180)/360*n-f.x0,(1-Math.asinh(Math.tan(lat*Math.PI/180))/Math.PI)/2*n-f.y0];
  };
  const geoPath=(g:Geometri)=>g.coordinates.map(poly=>ringPath(poly.map(r=>r.map(pixel)))).join(' ');
  const footprint=target?ringPath(target.bangunan.geom.coordinates.map(r=>r.map(pixel))):"";
  return <main className={s.halaman}>
    <header className={s.kepala}><p className={s.label}>PENGUJIAN KONTUR ATAP</p><h1>Batasnya bisa diperiksa.</h1><p>Bangunan uji berada di luar sembilan contoh demo.</p></header>
    <p className={s.peringatan} role="note">Evaluasi awal · acuan visual belum ditinjau anggota tim. Ketepatan pada citra 2D belum membuktikan kondisi atap di lapangan.</p>
    <div className={s.kontrol}><label>Kelompok sampel<select value={split} onChange={e=>{setSplit(e.target.value);setDipilih(null);}}><option value="uji">Pengujian akhir · 10 bangunan</option><option value="pengembangan">Pengembangan · 20 bangunan</option></select></label><p>{summary.berlabel} dapat dinilai · {summary.ambigu} ambigu · {summary.gagal_sumber} gagal sumber{summary.belum_dijalankan>0?` · ${summary.belum_dijalankan} belum dijalankan`:""}</p></div>
    <div className={s.angka}>
      <Angka label="Kesesuaian kontur · IoU" nilai={format(summary.semua.mean_iou)} ukuran="display" keterangan="Skala 0–1; lebih tinggi lebih sesuai"/>
      <Angka label="Median kesalahan luas" nilai={summary.semua.median_galat_luas_persen===null?"—":format(summary.semua.median_galat_luas_persen,1)+"%"} ukuran="display" keterangan={`${summary.semua.n} atap dengan acuan · termasuk fallback`}/>
      <Angka label="Waktu proses median" nilai={format(summary.durasi_median_detik,1)+" dtk"} ukuran="display" keterangan="Mesin lokal · citra dan inferensi"/>
    </div>
    <section className={s.pemeriksaan} aria-label="Periksa kontur per bangunan">
      <div><label className={s.pilihan}>Bangunan<select value={row?.id??""} onChange={e=>setDipilih(Number(e.target.value))}>{rows.map(b=><option key={b.id} value={b.id}>{b.id} · {b.metrik?b.method==="cv"?"hasil model":"perkiraan OSM":"acuan ambigu"}</option>)}</select></label>
        {target&&row&&<svg className={s.citra} viewBox={target.crop.join(" ")} role="img" aria-label={`Perbandingan acuan visual dan hasil bangunan ${row.id}`}>
          {target.tiles.map(t=><image key={t.url} href={t.url} x={t.x} y={t.y} width="256" height="256" onError={()=>setCitraGagal(sebelumnya=>new Set([...sebelumnya,row.id]))}/>)}
          {row.metrik&&<><path className={s.prediksi} d={row.prediksi_geojson?geoPath(row.prediksi_geojson):footprint} fillRule="evenodd"/>{row.acuan_geojson&&<path className={s.acuan} d={geoPath(row.acuan_geojson)} fillRule="evenodd"/>}</>}
        </svg>}
        {row&&citraGagal.has(row.id)&&<p className={s.peringatan} role="status">Citra tidak termuat. Hasil pengujian tetap tersedia.</p>}
        <div className={s.legenda}><span>━ {row?.method==="cv"?"Hasil model":"Perkiraan OSM"}</span><span>┄ Acuan visual</span></div>
        <p className={s.sumber}>Esri · Vantor · Earthstar Geographics · <a href="https://www.openstreetmap.org/copyright">© OpenStreetMap contributors</a></p>
      </div>
      <div>{row?.metrik?<><h2>Hasil dibandingkan dengan acuan.</h2><DaftarData baris={[{label:"IoU kontur",nilai:format(row.metrik.iou,3)},{label:"Kesalahan luas",nilai:format(row.metrik.galat_luas_persen,1)+"%"},{label:"Metode keluaran",nilai:row.method==="cv"?"Segmentasi citra":"Perkiraan dari OSM"},{label:"Ukuran sampel",nilai:row.strata}]}/></>:<><h2>Acuan belum dapat dipastikan.</h2><p>{row?.catatan_acuan||"Sampel belum tersedia."}</p><p>Sampel tetap masuk jumlah pemeriksaan.</p></>}
        <p>Garis putih dibuat dari citra tanpa melihat hasil model. Anggota tim masih perlu meninjau batasnya.</p>
        <Link href="/peta">Coba analisis bangunan lain →</Link>
      </div>
    </section>
    <PanelLipat judul="Metode, cakupan, dan jejak data"><p>30 bangunan dipilih sebelum prediksi diperiksa: 10 kecil, 10 sedang, dan 10 besar. Pola algoritme dipilih memakai kelompok pengembangan. Sepuluh bangunan uji disisihkan untuk pemeriksaan akhir.</p><p>IoU membandingkan kontur terhadap acuan visual. Kesalahan luas membandingkan angka luas keluaran terhadap acuan. Sampel ambigu tidak memiliki skor acuan; jumlahnya tetap ditampilkan. Skor internal model belum dikalibrasi sebagai persentase akurasi.</p><DaftarData baris={[{label:"Model",nilai:laporan.model_version},{label:"Dataset",nilai:laporan.dataset},{label:"Hasil model",nilai:`${summary.cv_diterima} bangunan`},{label:"Fallback",nilai:`${summary.fallback} bangunan`}]}/><p className={s.hash}>Manifest: {laporan.sha256_manifest}<br/>Acuan: {laporan.sha256_anotasi}</p></PanelLipat>
    <p className={s.kembali}><Link href="/metodologi">Lihat rumus energi, ekonomi, dan karbon →</Link></p>
  </main>;
}
