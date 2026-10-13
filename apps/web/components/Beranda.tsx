"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronRight, Search } from "lucide-react";
import type { BangunanRingkas } from "@petasurya/contracts";
import { Ikon, PanelLipat, Tombol, kelasTautan, m2 } from "@petasurya/ui";
import { Peta, type BangunanPeta } from "./Peta";
import { bangunanDiArea, GalatPemindaian, indeksHasil } from "../lib/api";
import { BATAS_KOTA, namaBangunan, simulasiContoh } from "../lib/pemindaian";
import s from "./beranda.module.css";

export function BerandaInteraktif({ bangunan, query }: { bangunan: BangunanRingkas[]; query: string }) {
  const router=useRouter();
  const [daftar,setDaftar]=useState(bangunan);
  const [cakupan,setCakupan]=useState("Katalog awal di sekitar UNIB");
  const [sibuk,setSibuk]=useState(false);
  const [galat,setGalat]=useState<string|null>(null);
  const [batasDaftar,setBatasDaftar]=useState(20);
  const [tersimpan,setTersimpan]=useState(()=>new Set(bangunan.filter(b=>simulasiContoh(b.id)).map(b=>b.id)));
  useEffect(()=>{let aktif=true;indeksHasil().then(ids=>{if(aktif)setTersimpan(new Set(ids));}).catch(()=>{});return()=>{aktif=false;};},[]);
  const hasil=useMemo(()=>daftar.filter(b=>[namaBangunan(b),b.id,b.building_tag].join(" ").toLowerCase().includes(query.trim().toLowerCase())).sort((a,b)=>Number(Boolean(b.nama))-Number(Boolean(a.nama)) || namaBangunan(a).localeCompare(namaBangunan(b),"id")),[daftar,query]);
  const bangunanPeta=useMemo<BangunanPeta[]>(()=>hasil.map(b=>({id:b.id,nama:namaBangunan(b),geom:b.geom})),[hasil]);
  const pilih=useCallback((id:number)=>router.push(`/pindai?id=${id}`),[router]);
  const cariArea=useCallback(async(lat:number,lon:number)=>{
    setSibuk(true);setGalat(null);
    try {const data=await bangunanDiArea(lat,lon);setDaftar(data);setCakupan("Radius 200 m dari pusat peta");setBatasDaftar(20);}
    catch(e){setGalat(e instanceof GalatPemindaian ? e.message : "Data bangunan belum dapat diambil. Pilihan sebelumnya tetap tersedia.");}
    finally{setSibuk(false);}
  },[]);
  return <main className={s.halaman}>
    <header className={s.kepala}><div><p className={s.label}>Potensi PLTS atap · Bengkulu</p><h1 className={s.judul}>Atapmu, dihitung.</h1></div><p className={s.alur}>Pilih bangunan <ChevronRight size={16} aria-hidden="true"/> Tinjau atap <ChevronRight size={16} aria-hidden="true"/> Hitung potensi</p></header>
    <section className={s.barisPeta} aria-label="Peta dan pilihan bangunan">
      <div className={s.kolomPeta}><Peta className={s.petaBeranda} label="Peta bangunan Kota Bengkulu" tinggi={520} bangunan={bangunanPeta} onPilihBangunan={pilih} onCariArea={cariArea} mencariArea={sibuk} batasPencarian={BATAS_KOTA} pertahankanKamera satelitAwal/>
        <p className={s.statusTeks}>Geser peta, lalu gunakan “Cari area ini” untuk mengambil bangunan OSM lainnya.</p>
      </div>
      <aside className={s.status} aria-labelledby="judul-daftar">
        <div className={s.kepalaDaftar}><h2 id="judul-daftar" className={s.statusJudul}>{query.trim() ? "Hasil pencarian" : "Bangunan tersedia"}</h2><span className={s.jumlah} aria-label={`${hasil.length} bangunan`}>{hasil.length}</span></div>
        <p className={s.statusTeks}>{cakupan}</p>
        {galat&&<p className={s.galat} role="alert">{galat}</p>}
        {sibuk&&<p className={s.statusTeks} role="status">Mengambil bangunan dari OpenStreetMap…</p>}
        <div className={s.contohCepat}><span className={s.label}>Mulai dengan hasil tersimpan</span><div>{[{id:1146141501,nama:"Kampus"},{id:1145010599,nama:"Rumah"},{id:991016391,nama:"Toko"}].map(b=><Link key={b.id} href={`/pindai?id=${b.id}`} className={kelasTautan()}>{b.nama}</Link>)}</div></div>
        {hasil.length ? <ul className={s.daftarBangunan} aria-label="Bangunan yang bisa dianalisis">{hasil.slice(0,batasDaftar).map(b=><li key={b.id}><Link href={`/pindai?id=${b.id}`} className={s.bangunan} aria-label={`Analisis ${namaBangunan(b)}, luas bangunan ${m2(b.footprint_m2)}`}><span className={s.ringkasanBangunan}><strong>{namaBangunan(b)}</strong><span>{m2(b.footprint_m2)} · {tersimpan.has(b.id) ? "Hasil tersimpan" : "Belum dianalisis"}</span></span><Ikon ikon={ChevronRight}/></Link></li>)}</ul> : <div className={s.keadaanKosong}><Ikon ikon={Search}/><p>Belum ada bangunan yang cocok. Geser peta atau ubah pencarian.</p></div>}
        {hasil.length>batasDaftar&&<Tombol varian="sekunder" onClick={()=>setBatasDaftar(n=>n+20)}>Tampilkan 20 lagi</Tombol>}
        {cakupan!=="Katalog awal di sekitar UNIB"&&<Tombol varian="sekunder" onClick={()=>{setDaftar(bangunan);setCakupan("Katalog awal di sekitar UNIB");setBatasDaftar(20);setGalat(null);}}>Kembali ke katalog awal</Tombol>}
        <div className={s.tentangData}><PanelLipat judul="Cakupan dan alur demo"><p>{bangunan.length} bangunan pada katalog lokal, {tersimpan.size} hasil tersimpan. Bangunan lain dianalisis saat dipilih.</p><ol><li>Pilih bangunan pada peta atau daftar.</li><li>Analisis dan tinjau batas serta luasnya.</li><li>Hitung potensi, lalu ubah asumsi pada hasil.</li></ol><p>Citra dan pengambilan bangunan baru memerlukan internet. Cuaca memakai acuan Bengkulu 2024.</p><Link href="/sumber-data" className={kelasTautan()}>Sumber data</Link></PanelLipat></div>
      </aside>
    </section>
  </main>;
}
