"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore, type CSSProperties } from "react";
import type { HasilSimulasi, PaketPemindaian } from "@petasurya/contracts";
import { AlertTriangle, ArrowLeft, ArrowRight, Pause, Play, Scan, Square, X } from "lucide-react";
import { Angka, BandingLapisan, DaftarData, GrafikBulanan, Ikon, Lencana, PanelLipat, PilihanKartu, Tombol, kelasTombol, kwh, kwp, m2, rupiah, tahun } from "@petasurya/ui";
import { GalatPemindaian, GalatSimulasi, hitungUlangAtap, muatPemindaian, pindaiBangunan } from "../lib/api";
import { KATALOG_BANGUNAN, PROFIL_SIMULASI, type ProfilSimulasi, areaSkenario, namaBangunan, paketBangunan, profilBangunan, potensiLuas, simulasiContoh, tampilanPaket } from "../lib/pemindaian";
import { TAHAP_INFO } from "./pemindaiData";
import { PanggungAtap } from "./PanggungAtap";
import { AlurEnergi } from "./AlurEnergi";
import s from "./pemindaiAtap.module.css";

const KUERI_SEMPIT = "(max-width: 560px)";
const langgananSempit = (ubah: () => void) => {
  const mq = window.matchMedia(KUERI_SEMPIT);
  mq.addEventListener("change", ubah);
  return () => mq.removeEventListener("change", ubah);
};
const cekSempit = () => window.matchMedia(KUERI_SEMPIT).matches;
const pathRing = (ring: number[][]) => `M${ring.map(p => p.join(",")).join(" L")}Z`;

function WaktuBerjalan() {
  const [detik, setDetik] = useState(0);
  useEffect(() => {
    const mulai = performance.now();
    const timer = window.setInterval(() => setDetik(Math.floor((performance.now() - mulai) / 1000)), 1000);
    return () => window.clearInterval(timer);
  }, []);
  return <span aria-hidden="true"> · {detik.toLocaleString("id-ID")} dtk</span>;
}

type Props = {
  bangunanAwalId?: number;
  paketAwal?: PaketPemindaian;
  mode?: "halaman" | "modal" | "tertanam";
  onTutup?: () => void;
};

export function PemindaiAtap({ bangunanAwalId, paketAwal, mode = "halaman", onTutup }: Props) {
  const idAwal = paketAwal?.bangunan.id ?? bangunanAwalId ?? 1146141501;
  const awal = paketAwal ?? (() => { const b = KATALOG_BANGUNAN.find(b => b.id === idAwal); return b ? paketBangunan(b) : null; })();
  const [id, setId] = useState(idAwal);
  const [paket, setPaket] = useState<PaketPemindaian | null>(awal);
  const [pilihan, setPilihan] = useState(KATALOG_BANGUNAN);
  const [tahap, setTahap] = useState(mode === "modal" && awal?.analisis ? 2 : 1);
  const [profil, setProfil] = useState<ProfilSimulasi>(awal ? profilBangunan(awal.bangunan) : "rumah");
  const [simulasi, setSimulasi] = useState<HasilSimulasi | undefined>();
  const [kapasitas,setKapasitas]=useState("");
  const [sibuk, setSibuk] = useState<"muat" | "analisis" | "hitung" | null>(null);
  const [galat, setGalat] = useState<string | null>(null);
  const [citraGagal, setCitraGagal] = useState(false);
  const [bandingkanOSM, setBandingkanOSM] = useState(false);
  const [demoAktif, setDemoAktif] = useState(false);
  const [demoJeda, setDemoJeda] = useState(false);
  const [demoSelesai, setDemoSelesai] = useState(false);
  const [putaranDemo, setPutaranDemo] = useState(0);
  const jadwalDemo = useRef<{ babak: string; sisa: number } | null>(null);
  const wadahRef = useRef<HTMLDivElement>(null);
  const sempit = useSyncExternalStore(langgananSempit, cekSempit, () => false);
  const aktif = paket?.bangunan.id === id ? paket : null;
  const a = aktif?.analisis;
  const gambar = useMemo(() => aktif ? tampilanPaket(aktif) : null, [aktif]);

  useEffect(() => {
    let berlaku = true;
    const local = paketAwal?.bangunan.id === id ? paketAwal : (() => { const b = KATALOG_BANGUNAN.find(b => b.id === id); return b ? paketBangunan(b) : null; })();
    setPaket(local); setGalat(null); setCitraGagal(false);
    setDemoAktif(false); setDemoJeda(false); setDemoSelesai(false);
    setProfil(local ? profilBangunan(local.bangunan) : "rumah");
    setSimulasi(undefined);
    setKapasitas(local?.analisis ? String(Math.min(potensiLuas(local),PROFIL_SIMULASI[profilBangunan(local.bangunan)].data.asumsi.daya_va/1000)) : "");
    setSibuk("muat");
    if (mode === "halaman") {
      const url = new URL(window.location.href);
      url.searchParams.set("id", String(id));
      window.history.replaceState(null, "", url);
    }
    muatPemindaian(id).then(data => {
      if (!berlaku) return;
      setPaket(data);
      setPilihan(list => list.some(b => b.id === id) ? list : [...list, data.bangunan]);
      if (!local) setProfil(profilBangunan(data.bangunan));
      if (data.analisis) setKapasitas(String(Math.min(potensiLuas(data),PROFIL_SIMULASI[profilBangunan(data.bangunan)].data.asumsi.daya_va/1000)));
      if (local?.analisis && data.analisis && ["roof_area_m2", "usable_area_m2", "azimuth_deg", "model_version"].some(k => local.analisis?.[k as keyof typeof data.analisis] !== data.analisis?.[k as keyof typeof data.analisis])) setSimulasi(undefined);
    }).catch(error => {
      if (berlaku && !local?.analisis) setGalat(error instanceof GalatPemindaian ? error.message : "Mesin belum dapat dihubungi. Coba lagi atau pilih hasil tersimpan.");
    }).finally(() => { if (berlaku) setSibuk(null); });
    return () => { berlaku = false; };
  }, [id, mode, paketAwal]);

  useEffect(() => {
    let berlaku = true;
    const images = aktif?.bingkai.tiles.map(tile => {
      const image = new Image();
      image.onerror = () => { if (berlaku) setCitraGagal(true); };
      image.src = tile.url;
      return image;
    }) ?? [];
    return () => { berlaku = false; images.forEach(image => { image.onerror = null; }); };
  }, [aktif?.bingkai.tiles]);

  useEffect(() => {
    if (mode !== "modal") return;
    const container = wadahRef.current;
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const controls = () => Array.from(container?.querySelectorAll<HTMLElement>("button:not([disabled]), a[href], select:not([disabled]), input, summary, [tabindex='0']") ?? []).filter(el => el.getClientRects().length > 0);
    controls()[0]?.focus();
    const tab = (e: KeyboardEvent) => {
      if (e.key === "Tab") {
        const list = controls();
        if (e.shiftKey && document.activeElement === list[0]) { e.preventDefault(); list.at(-1)?.focus(); }
        else if (!e.shiftKey && document.activeElement === list.at(-1)) { e.preventDefault(); list[0]?.focus(); }
      }
    };
    window.addEventListener("keydown", tab);
    return () => { window.removeEventListener("keydown", tab); document.body.style.overflow = overflow; previous?.focus(); };
  }, [mode, onTutup]);

  useEffect(() => {
    const container = wadahRef.current;
    const keydown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && mode === "modal") { e.preventDefault(); onTutup?.(); return; }
      const el = e.target;
      if (!(el instanceof SVGElement) || !container?.contains(el) || sibuk || e.ctrlKey || e.metaKey || e.altKey) return;
      const next = e.key === "ArrowRight" ? tahap+1 : e.key === "ArrowLeft" ? tahap-1 : Number(e.key);
      if (next >= 1 && next <= 3 && (next === 1 || (next === 2 && a) || (next === 3 && simulasi))) { e.preventDefault(); setDemoAktif(false); setTahap(next); }
    };
    window.addEventListener("keydown", keydown);
    return () => { window.removeEventListener("keydown", keydown); };
  }, [a, mode, onTutup, sibuk, simulasi, tahap]);

  async function analisisBaru(force=false, demoLangsung=false) {
    if (sibuk) return;
    setSibuk("analisis"); setGalat(null);
    if (demoLangsung) { setDemoAktif(false); setDemoSelesai(false); setTahap(1); }
    try {
      const data = await pindaiBangunan(id, force);
      setPaket(data); setSimulasi(undefined);
      setKapasitas(String(Math.min(potensiLuas(data),PROFIL_SIMULASI[profil].data.asumsi.daya_va/1000)));
      setTahap(2);
      if (demoLangsung) { setDemoJeda(false); setBandingkanOSM(true); setDemoAktif(true); setPutaranDemo(n => n + 1); }
    }
    catch (error) { setGalat(error instanceof GalatPemindaian ? error.message : "Analisis belum berhasil. Cek koneksi dan coba lagi."); }
    finally { setSibuk(null); }
  }

  const hitungPotensi = useCallback(async () => {
    if (!a || sibuk) return;
    const dipilih=Number(kapasitas);
    if (!aktif || !Number.isFinite(dipilih) || dipilih<.55 || dipilih>potensiLuas(aktif)+.001) {setGalat("Kapasitas skenario harus sesuai rentang luas atap dan minimal satu modul 550 Wp.");return;}
    setSibuk("hitung"); setGalat(null);
    try {
      const acuan = PROFIL_SIMULASI[profil].data;
      const data = await hitungUlangAtap({ roof_analysis_id: a.roof_analysis_id, asumsi: acuan.asumsi, parameter_fisika: acuan.parameter_fisika, usable_area_m2:Math.min(a.usable_area_m2,areaSkenario(dipilih,profil)) });
      setSimulasi(data); setTahap(3);
    } catch (error) { setGalat(error instanceof GalatSimulasi ? error.message : "Perhitungan belum berhasil. Cek koneksi dan coba lagi."); }
    finally { setSibuk(null); }
  }, [a, aktif, kapasitas, profil, sibuk]);

  useEffect(() => {
    if (!demoAktif || demoJeda || sibuk) return;
    if (galat) { setDemoAktif(false); return; }
    const babak = `${putaranDemo}-${tahap}`;
    if (jadwalDemo.current?.babak !== babak) jadwalDemo.current = {babak, sisa: tahap === 1 ? 4500 : tahap === 2 ? 5500 : 6500};
    const mulai = performance.now();
    const waktu = setTimeout(() => {
      if (tahap === 1) setTahap(2);
      else if (tahap === 2) void hitungPotensi();
      else { setDemoAktif(false); setDemoSelesai(true); }
    }, jadwalDemo.current.sisa);
    return () => {
      clearTimeout(waktu);
      if (jadwalDemo.current?.babak === babak) jadwalDemo.current.sisa = Math.max(0, jadwalDemo.current.sisa - (performance.now() - mulai));
    };
  }, [demoAktif, demoJeda, galat, hitungPotensi, putaranDemo, sibuk, tahap]);

  useEffect(() => {
    const jedaSaatTersembunyi = () => { if (document.hidden && demoAktif) setDemoJeda(true); };
    document.addEventListener("visibilitychange", jedaSaatTersembunyi);
    return () => document.removeEventListener("visibilitychange", jedaSaatTersembunyi);
  }, [demoAktif]);

  const hentikanDemo = () => { setDemoAktif(false); setDemoJeda(false); };
  const mulaiDemo = () => {
    if (!a || sibuk) return;
    setGalat(null); setTahap(1); setBandingkanOSM(false);
    setDemoJeda(false); setDemoSelesai(false); setDemoAktif(true); setPutaranDemo(n => n+1);
  };

  const frame = aktif?.bingkai;
  const width = gambar ? Math.min(frame?.lebar ?? 640, Math.max(320, gambar.bbox[2]+72, (gambar.bbox[3]+72)*4/3)) : 640;
  const tinggiDemo = frame && gambar ? Math.min(frame.tinggi, Math.max(frame.lebar/2, gambar.bbox[3]+96)) : 480;
  const viewBox = sempit && frame ? `${frame.lebar/2-width/2} ${frame.tinggi/2-width*3/8} ${width} ${width*3/4}` : demoAktif && frame ? `0 ${(frame.tinggi-tinggiDemo)/2} ${frame.lebar} ${tinggiDemo}` : `0 0 ${frame?.lebar ?? 640} ${frame?.tinggi ?? 480}`;
  const masque = gambar?.mask_rings.map(poly => poly.map(pathRing).join(" ")).join(" ") ?? "";
  const Judul = mode === "halaman" ? "h1" : "h2";
  const citraAtap = (osm: boolean, asli=false) => frame && gambar ? <PanggungAtap key={`${id}-${tahap}-${osm}-${asli}-${putaranDemo}`}
    frame={frame} footprint={gambar.footprint} mask={masque} bbox={gambar.bbox} viewBox={viewBox} osm={osm}
    asli={asli}
    demo={demoAktif} memindai={sibuk === "analisis"} citraGagal={citraGagal} onCitraGagal={() => setCitraGagal(true)}
    fokus={!bandingkanOSM || tahap !== 2} nilai={m2(osm ? aktif?.bangunan.footprint_m2 ?? 0 : a?.roof_area_m2 ?? 0)} label={`Citra ${aktif ? namaBangunan(aktif.bangunan) : "bangunan"}; ${asli ? "citra asli" : osm ? "jejak OSM" : "batas atap"}`} /> : null;

  const kanvas = (<section className={s.kolomKanvas} aria-label={tahap === 3 ? "Produksi energi" : "Citra dan batas bangunan"}>
        {tahap === 3 && simulasi ? <div className={s.hasilGrafik} key={`${id}-${putaranDemo}`}>
          <AlurEnergi />
          <Angka label="Produksi tahun pertama" nilai={kwh(simulasi.e_ac_kwh_yr1)} keterangan="kWh/tahun · cuaca acuan Bengkulu 2024" aksen="surya"/>
          <GrafikBulanan data={simulasi.monthly_kwh} animasi/>
          <p className={s.penjelasanTahap}>Energi dihitung dari kapasitas skenario, orientasi asumsi, cuaca, dan faktor rugi.</p>
        </div> : <>
          <div className={s.labelBaris}><strong>{tahap === 1 ? "Jejak bangunan OSM" : a?.mask_geojson ? "Batas atap hasil model" : "Perkiraan dari jejak OSM"}</strong>{a && <Lencana>{aktif?.tersimpan ? "Hasil tersimpan" : "Analisis baru"}</Lencana>}</div>
          {tahap === 2 && bandingkanOSM ? <BandingLapisan sebelum={citraAtap(true,true)} sesudah={citraAtap(false)} labelSebelum="Citra asli" labelSesudah={a?.mask_geojson ? "Kontur model" : "Perkiraan atap"} label="Perbandingan citra asli dan batas atap" rasio="4 / 3" /> : citraAtap(tahap === 1)}
          <p className={s.bantuan}>Esri · Vantor · Earthstar Geographics · <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">© OpenStreetMap contributors</a></p>
          {citraGagal && <p role="status" className={s.penjelasanTahap}>Citra tidak tersedia. Batas dan hasil tersimpan tetap dapat dibaca.</p>}
          {tahap === 2 && <label className={s.itemLapisan}><input type="checkbox" checked={bandingkanOSM} onChange={e => {hentikanDemo();setBandingkanOSM(e.target.checked);}}/>Bandingkan dengan citra asli</label>}
        </>}
      </section>);
  const panel = (<aside key={`${id}-${tahap}-${putaranDemo}`} className={s.panelTelemetri} aria-label="Hasil tahap analisis" data-babak={tahap}>
        <h2 className={s.kartuInfoJudul}>{tahap === 1 ? (aktif ? namaBangunan(aktif.bangunan) : `Bangunan ${id}`) : TAHAP_INFO[tahap-1].subjudul}</h2>
        {tahap === 1 && <>
          {aktif && <div className={s.fokusJawaban}><Angka label="Luas jejak bangunan" nilai={m2(aktif.bangunan.footprint_m2)} ukuran="display"/></div>}
          <p className={s.penjelasanTahap}>{a ? "Hasil tersedia. Tinjau batasnya atau jalankan analisis baru." : "Analisis membaca citra satelit untuk menentukan batas dan luas atap."}</p>
          <Tombol varian="primer" ikon={a ? ArrowRight : Scan} disabled={Boolean(sibuk) || !aktif} onClick={() => { hentikanDemo(); if (a) setTahap(2); else void analisisBaru(); }}>{a ? "Tinjau batas dan luas" : "Analisis atap"}</Tombol>
        </>}
        {tahap === 2 && a && <>
          {a.method === "footprint_fallback" && <div role="alert" className={s.kotakPeringatan}><Ikon ikon={AlertTriangle}/><span>Batas model belum dapat dipakai. Luas memakai perkiraan OSM.</span></div>}
          <div className={s.fokusJawaban} data-aksen="surya"><Angka label={a.mask_geojson ? "Luas proyeksi atap" : "Perkiraan luas atap"} nilai={m2(a.roof_area_m2)} ukuran="display" aksen="surya"/></div>
          <div className={s.bagianLuas} role="img" aria-label={`Luas perhitungan ${m2(a.usable_area_m2)}; cadangan area 15 persen sebagai asumsi`}><span style={{width:`${a.roof_area_m2 ? a.usable_area_m2/a.roof_area_m2*100 : 0}%`}}/></div>
          <DaftarData baris={[{label:"Luas untuk perhitungan",nilai:m2(a.usable_area_m2)},{label:"Cadangan area",nilai:"15% · asumsi"}]}/>
          <p className={s.penjelasanTahap}>Batas belum diverifikasi. Halangan dan bayangan belum diukur.</p>
          {demoAktif ? <>
            <DaftarData baris={[{label:"Skenario listrik",nilai:PROFIL_SIMULASI[profil].nama},{label:"Kapasitas skenario",nilai:kwp(Number(kapasitas))}]}/>
            <p className={s.penjelasanTahap}>Profil pemakaian masih asumsi; dapat diubah pada hasil.</p>
          </> : <>
          <PilihanKartu label="Skenario listrik" nama={`profil-${mode}`} nilai={profil} nonaktif={Boolean(sibuk)}
            pilihan={Object.entries(PROFIL_SIMULASI).map(([nilai, p]) => ({ nilai: nilai as ProfilSimulasi, label: p.nama, rincian: `${p.data.asumsi.golongan_tarif} · ${p.data.asumsi.daya_va.toLocaleString("id-ID")} VA` }))}
            onUbah={next => {hentikanDemo();setProfil(next);setSimulasi(undefined);if(aktif)setKapasitas(String(Math.min(potensiLuas(aktif),PROFIL_SIMULASI[next].data.asumsi.daya_va/1000)));}} />
          <label className={s.pilihBangunan}>Kapasitas skenario (kWp)<input type="number" min="0.55" step="0.01" max={aktif ? potensiLuas(aktif) : undefined} value={kapasitas} disabled={Boolean(sibuk)} onChange={e=>{hentikanDemo();setKapasitas(e.target.value);setSimulasi(undefined);}}/></label>
          <p className={s.penjelasanTahap}>Awal skenario mengikuti daya listrik yang dipilih. Potensi luas atap {aktif ? kwp(potensiLuas(aktif)) : "—"}.</p>
          <p className={s.penjelasanTahap}>Profil pemakaian masih asumsi; dapat diubah pada hasil.</p>
          <Tombol varian="primer" ikon={ArrowRight} disabled={Boolean(sibuk)} onClick={() => {hentikanDemo();void hitungPotensi();}}>Hitung potensi</Tombol>
          <Tombol varian="sekunder" disabled={Boolean(sibuk)} onClick={() => {hentikanDemo();void analisisBaru(true);}}>Analisis ulang batas</Tombol>
          </>}
        </>}
        {tahap === 3 && simulasi && <>
          <div className={s.fokusJawaban} data-aksen="daun"><Angka label="Potensi hemat per tahun" nilai={rupiah(simulasi.savings_idr_yr1,true)} ukuran="display" aksen="daun" keterangan={`Balik modal ${simulasi.payback_years === null ? "lebih dari 25 tahun" : tahun(simulasi.payback_years)}`}/></div>
          <DaftarData baris={[{label:"Kapasitas perhitungan",nilai:kwp(simulasi.kwp)},{label:"Potensi luas atap",nilai:aktif ? kwp(potensiLuas(aktif)) : "—"},{label:"Modul dalam skenario",nilai:`${simulasi.module_count.toLocaleString("id-ID")} modul`},{label:"Skenario listrik",nilai:PROFIL_SIMULASI[profil].nama}]}/>
          <p className={s.penjelasanTahap}>Kapasitas pasang memerlukan penataan panel dan pemeriksaan atap.</p>
          <Link href={`/atap/${id}?profil=${profil}&kwp=${kapasitas}`} onClick={onTutup} className={kelasTombol("primer")}>Lihat hasil dan ubah asumsi<Ikon ikon={ArrowRight}/></Link>
          <Tombol varian="sekunder" ikon={ArrowLeft} onClick={() => {hentikanDemo();setTahap(2);}}>Kembali ke batas dan luas</Tombol>
        </>}
        {a && <PanelLipat judul="Rincian analisis">
          {aktif && !aktif.tersimpan && <DaftarData baris={[{label:"Waktu proses engine",nilai:`${aktif.durasi_detik.toLocaleString("id-ID",{maximumFractionDigits:2})} dtk`}]}/>}
          <DaftarData baris={[{label:"Sumber batas",nilai:a.mask_geojson ? "Model pada citra satelit" : "Perkiraan OSM"},{label:"Sumbu atap",nilai:`${a.azimuth_deg.toLocaleString("id-ID")}°; hadap panel asumsi`},{label:"Kemiringan",nilai:`${a.tilt_deg}° · asumsi`},{label:"Model",nilai:a.model_version},{label:"Skor penyaringan",nilai:a.confidence.toLocaleString("id-ID",{maximumFractionDigits:3})}]}/>
          <p className={s.penjelasanTahap}>Skor belum dikalibrasi sebagai akurasi atap.</p>
          <Link href="/evaluasi">Lihat hasil pengujian kontur</Link>
        </PanelLipat>}
      </aside>);

  const isi = <div ref={wadahRef} className={s.wadah} data-demo-jeda={demoJeda || undefined} role={mode === "modal" ? "dialog" : undefined} aria-modal={mode === "modal" ? true : undefined} aria-labelledby="judul-pemindai">
    <header className={s.kepala}>
      <div className={s.kepalaJudul}>
        {mode !== "modal" && <Link href="/peta" className={s.kembali}><Ikon ikon={ArrowLeft}/>Pilih di peta</Link>}
        <Judul id="judul-pemindai" className={s.judul}>Analisis atap</Judul>
      </div>
      <div className={s.aksiKepala}>
        {demoAktif ? <><Tombol ikon={demoJeda ? Play : Pause} onClick={() => setDemoJeda(j => !j)}>{demoJeda ? "Lanjutkan demo" : "Jeda demo"}</Tombol><Tombol ikon={Square} onClick={hentikanDemo}>Akhiri demo</Tombol></> : <><Tombol ikon={Scan} disabled={!aktif || Boolean(sibuk)} onClick={() => void analisisBaru(true,true)}>Demo langsung</Tombol><Tombol ikon={Play} disabled={!a || Boolean(sibuk)} onClick={mulaiDemo}>{demoSelesai ? "Putar ulang hasil" : "Putar hasil"}</Tombol></>}
        {mode === "modal" && <Tombol ikon={X} hanyaIkon onClick={onTutup}>Tutup pemindai</Tombol>}
      </div>
    </header>
    <nav className={s.stepper} aria-label="Tahap analisis" style={{"--tahap-index": tahap-1} as CSSProperties}>
      <span className={s.penunjukTahap} aria-hidden="true" />
      {TAHAP_INFO.map(step => <button key={step.nomor} type="button" className={`${s.tombolTahap} ${tahap === step.nomor ? s.tahapAktif : ""}`} aria-pressed={tahap === step.nomor} disabled={Boolean(sibuk) || (step.nomor === 2 && !a) || (step.nomor === 3 && !simulasi)} onClick={() => {hentikanDemo();setTahap(step.nomor);}}>
        <span className={s.tahapNomor} aria-hidden="true">0{step.nomor}</span><span className={s.tahapNama}>{step.nama}</span>
      </button>)}
    </nav>
    {demoAktif && <div className={s.statusDemo} role="status"><span className={s.titikDemo} aria-hidden="true"/>{demoJeda ? "Demo dijeda" : "Peragaan hasil analisis"}<span>{sibuk === "hitung" ? "Menghitung skenario" : TAHAP_INFO[tahap-1].nama}</span></div>}
    <label className={s.pilihBangunan}>Bangunan<select value={id} disabled={sibuk === "analisis" || sibuk === "hitung"} onChange={e => { setId(Number(e.target.value)); setTahap(1); }}>
      {!pilihan.some(b => b.id === id) && <option value={id}>Bangunan {id}</option>}
      {pilihan.map(b => <option key={b.id} value={b.id}>{namaBangunan(b)}{simulasiContoh(b.id) ? " · hasil tersimpan" : ""}</option>)}
    </select></label>
    {galat && <div role="alert" className={s.kotakPeringatan}><Ikon ikon={AlertTriangle}/><span>{galat}</span></div>}
    {sibuk && <p role="status" className={s.statusProses}>{sibuk === "analisis" ? "Membaca citra dan menjalankan analisis atap…" : sibuk === "hitung" ? "Menghitung energi dan penghematan…" : "Memuat bangunan dan hasil tersimpan…"}{sibuk === "analisis" && <WaktuBerjalan/>}</p>}
    <div className={s.gridPemindai} data-tahap={tahap} aria-busy={Boolean(sibuk)}>
      {tahap === 3 ? <>{panel}{kanvas}</> : <>{kanvas}{panel}</>}
    </div>
  </div>;
  return mode === "modal" ? <div className={s.wadahModal}><div className={s.kartuModal}>{isi}</div></div> : isi;
}
