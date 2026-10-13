"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import type { HasilSimulasi, PaketPemindaian } from "@petasurya/contracts";
import { AlertTriangle, ArrowLeft, ArrowRight, ChevronDown, Scan, X } from "lucide-react";
import { Angka, DaftarData, GrafikBulanan, Ikon, Lencana, Tombol, kelasTombol, kwh, kwp, m2, rupiah, tahun } from "@petasurya/ui";
import { GalatPemindaian, GalatSimulasi, hitungUlangAtap, muatPemindaian, pindaiBangunan } from "../lib/api";
import { KATALOG_BANGUNAN, PROFIL_SIMULASI, type ProfilSimulasi, areaSkenario, namaBangunan, paketBangunan, profilBangunan, potensiLuas, simulasiContoh, tampilanPaket } from "../lib/pemindaian";
import { TAHAP_INFO } from "./pemindaiData";
import s from "./pemindaiAtap.module.css";

const KUERI_SEMPIT = "(max-width: 560px)";
const langgananSempit = (ubah: () => void) => {
  const mq = window.matchMedia(KUERI_SEMPIT);
  mq.addEventListener("change", ubah);
  return () => mq.removeEventListener("change", ubah);
};
const cekSempit = () => window.matchMedia(KUERI_SEMPIT).matches;
const pathRing = (ring: number[][]) => `M${ring.map(p => p.join(",")).join(" L")}Z`;

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
  const wadahRef = useRef<HTMLDivElement>(null);
  const sempit = useSyncExternalStore(langgananSempit, cekSempit, () => false);
  const aktif = paket?.bangunan.id === id ? paket : null;
  const a = aktif?.analisis;
  const gambar = useMemo(() => aktif ? tampilanPaket(aktif) : null, [aktif]);

  useEffect(() => {
    let berlaku = true;
    const local = paketAwal?.bangunan.id === id ? paketAwal : (() => { const b = KATALOG_BANGUNAN.find(b => b.id === id); return b ? paketBangunan(b) : null; })();
    setPaket(local); setGalat(null); setCitraGagal(false);
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
      if (next >= 1 && next <= 3 && (next === 1 || (next === 2 && a) || (next === 3 && simulasi))) { e.preventDefault(); setTahap(next); }
    };
    window.addEventListener("keydown", keydown);
    return () => { window.removeEventListener("keydown", keydown); };
  }, [a, mode, onTutup, sibuk, simulasi, tahap]);

  async function analisisBaru(force=false) {
    if (sibuk) return;
    setSibuk("analisis"); setGalat(null);
    try { const data = await pindaiBangunan(id, force); setPaket(data); setSimulasi(undefined); setKapasitas(String(Math.min(potensiLuas(data),PROFIL_SIMULASI[profil].data.asumsi.daya_va/1000))); setTahap(2); }
    catch (error) { setGalat(error instanceof GalatPemindaian ? error.message : "Analisis belum berhasil. Cek koneksi dan coba lagi."); }
    finally { setSibuk(null); }
  }

  async function hitungPotensi() {
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
  }

  const frame = aktif?.bingkai;
  const width = gambar ? Math.min(frame?.lebar ?? 640, Math.max(320, gambar.bbox[2]+72, (gambar.bbox[3]+72)*4/3)) : 640;
  const viewBox = sempit && frame ? `${frame.lebar/2-width/2} ${frame.tinggi/2-width*3/8} ${width} ${width*3/4}` : `0 0 ${frame?.lebar ?? 640} ${frame?.tinggi ?? 480}`;
  const masque = gambar?.mask_rings.map(poly => poly.map(pathRing).join(" ")).join(" ") ?? "";
  const Judul = mode === "halaman" ? "h1" : "h2";

  const kanvas = (<section className={s.kolomKanvas} aria-label={tahap === 3 ? "Produksi energi" : "Citra dan batas bangunan"}>
        {tahap === 3 && simulasi ? <div className={s.hasilGrafik}>
          <Angka label="Produksi tahun pertama" nilai={kwh(simulasi.e_ac_kwh_yr1)} keterangan="kWh/tahun · cuaca acuan Bengkulu 2024" aksen="surya"/>
          <GrafikBulanan data={simulasi.monthly_kwh}/>
          <p className={s.penjelasanTahap}>Energi dihitung dari kapasitas skenario, orientasi asumsi, cuaca, dan faktor rugi.</p>
        </div> : <>
          <div className={s.labelBaris}><strong>{tahap === 1 ? "Jejak bangunan OSM" : a?.mask_geojson ? "Batas atap hasil model" : "Perkiraan dari jejak OSM"}</strong>{a && <Lencana>{aktif?.tersimpan ? "Hasil tersimpan" : "Analisis baru"}</Lencana>}</div>
          <div className={s.kotakSensor}>
            <svg className={s.kanvasSvg} viewBox={viewBox} role="img" tabIndex={0} aria-label={`Citra ${aktif ? namaBangunan(aktif.bangunan) : "bangunan"}; ${tahap === 1 ? "jejak OSM" : "batas atap"}`}>
              <defs><pattern id="arsirPerkiraan" width="8" height="8" patternUnits="userSpaceOnUse"><path d="M0 8L8 0" stroke="var(--surya)" strokeWidth="1"/></pattern></defs>
              {frame?.tiles.map(t => <image key={t.url} href={t.url} x={t.x} y={t.y} width="256" height="256" onError={() => setCitraGagal(true)}/>)}
              {gambar && (tahap === 1 || bandingkanOSM) && <path id="jejak-osm" d={pathRing(gambar.footprint)} fill="none" stroke="var(--brand-busbar)" strokeWidth="2" strokeDasharray="5 4"/>}
              {gambar && tahap === 2 && <g id="batas-atap">{masque ? <path d={masque} fill="var(--surya)" fillOpacity=".20" fillRule="evenodd" stroke="var(--surya)" strokeWidth="2"/> : <path d={pathRing(gambar.footprint)} fill="url(#arsirPerkiraan)" stroke="var(--surya)" strokeWidth="2" strokeDasharray="5 4"/>}</g>}
            </svg>
          </div>
          <p className={s.bantuan}>Esri · Vantor · Earthstar Geographics · <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">© OpenStreetMap contributors</a></p>
          {citraGagal && <p role="status" className={s.penjelasanTahap}>Citra tidak tersedia. Batas dan hasil tersimpan tetap dapat dibaca.</p>}
          {tahap === 2 && <label className={s.itemLapisan}><input type="checkbox" checked={bandingkanOSM} onChange={e => setBandingkanOSM(e.target.checked)}/>Bandingkan dengan jejak OSM</label>}
        </>}
      </section>);
  const panel = (<aside className={s.panelTelemetri} aria-label="Hasil tahap analisis">
        <h2 className={s.kartuInfoJudul}>{TAHAP_INFO[tahap-1].subjudul}</h2>
        {tahap === 1 && <>
          <p className={s.penjelasanTahap}>{aktif ? namaBangunan(aktif.bangunan) : `Bangunan ${id}`}</p>
          {aktif && <Angka label="Luas jejak bangunan" nilai={m2(aktif.bangunan.footprint_m2)} ukuran="display"/>}
          <p className={s.penjelasanTahap}>{a ? "Hasil tersedia. Tinjau batasnya atau jalankan analisis baru." : "Analisis membaca citra satelit untuk menentukan batas dan luas atap."}</p>
          <Tombol ikon={a ? ArrowRight : Scan} disabled={Boolean(sibuk) || !aktif} onClick={() => a ? setTahap(2) : void analisisBaru()}>{a ? "Tinjau batas dan luas" : "Analisis atap"}</Tombol>
        </>}
        {tahap === 2 && a && <>
          {a.method === "footprint_fallback" && <div role="alert" className={s.kotakPeringatan}><Ikon ikon={AlertTriangle}/><span>Batas model belum dapat dipakai. Luas memakai perkiraan OSM.</span></div>}
          <Angka label={a.mask_geojson ? "Luas proyeksi atap" : "Perkiraan luas atap"} nilai={m2(a.roof_area_m2)} ukuran="display" aksen="surya"/>
          <div className={s.bagianLuas} role="img" aria-label={`Luas perhitungan ${m2(a.usable_area_m2)}; cadangan area 15 persen sebagai asumsi`}><span style={{width:`${a.roof_area_m2 ? a.usable_area_m2/a.roof_area_m2*100 : 0}%`}}/></div>
          <DaftarData baris={[{label:"Luas untuk perhitungan",nilai:m2(a.usable_area_m2)},{label:"Cadangan area",nilai:"15% · asumsi"}]}/>
          <p className={s.penjelasanTahap}>Batas belum diverifikasi. Halangan dan bayangan belum diukur.</p>
          <label className={s.pilihBangunan}>Skenario listrik<select value={profil} disabled={Boolean(sibuk)} onChange={e => {const next=e.target.value as ProfilSimulasi;setProfil(next);setSimulasi(undefined);if(aktif)setKapasitas(String(Math.min(potensiLuas(aktif),PROFIL_SIMULASI[next].data.asumsi.daya_va/1000)));}}>{Object.entries(PROFIL_SIMULASI).map(([key,p])=><option key={key} value={key}>{p.nama}</option>)}</select></label>
          <label className={s.pilihBangunan}>Kapasitas skenario (kWp)<input type="number" min="0.55" step="0.01" max={aktif ? potensiLuas(aktif) : undefined} value={kapasitas} disabled={Boolean(sibuk)} onChange={e=>{setKapasitas(e.target.value);setSimulasi(undefined);}}/></label>
          <p className={s.penjelasanTahap}>Awal skenario mengikuti daya listrik yang dipilih. Potensi luas atap {aktif ? kwp(potensiLuas(aktif)) : "—"}.</p>
          <p className={s.penjelasanTahap}>Profil pemakaian masih asumsi; dapat diubah pada hasil.</p>
          <Tombol ikon={ArrowRight} disabled={Boolean(sibuk)} onClick={() => void hitungPotensi()}>Hitung potensi</Tombol>
          <Tombol varian="sekunder" disabled={Boolean(sibuk)} onClick={() => void analisisBaru(true)}>Analisis ulang batas</Tombol>
        </>}
        {tahap === 3 && simulasi && <>
          <Angka label="Potensi hemat per tahun" nilai={rupiah(simulasi.savings_idr_yr1,true)} ukuran="display" aksen="daun" keterangan={`Balik modal ${simulasi.payback_years === null ? "lebih dari 25 tahun" : tahun(simulasi.payback_years)}`}/>
          <DaftarData baris={[{label:"Kapasitas perhitungan",nilai:kwp(simulasi.kwp)},{label:"Potensi luas atap",nilai:aktif ? kwp(potensiLuas(aktif)) : "—"},{label:"Modul dalam skenario",nilai:`${simulasi.module_count.toLocaleString("id-ID")} modul`},{label:"Skenario listrik",nilai:PROFIL_SIMULASI[profil].nama}]}/>
          <p className={s.penjelasanTahap}>Kapasitas pasang memerlukan penataan panel dan pemeriksaan atap.</p>
          <Link href={`/atap/${id}?profil=${profil}&kwp=${kapasitas}`} onClick={onTutup} className={kelasTombol()}>Lihat hasil dan ubah asumsi<Ikon ikon={ArrowRight}/></Link>
          <Tombol varian="sekunder" ikon={ArrowLeft} onClick={() => setTahap(2)}>Kembali ke batas dan luas</Tombol>
        </>}
        {a && <details className={s.rincian}><summary>Rincian analisis<Ikon ikon={ChevronDown}/></summary>
          <DaftarData baris={[{label:"Sumber batas",nilai:a.mask_geojson ? "Model pada citra satelit" : "Perkiraan OSM"},{label:"Sumbu atap",nilai:`${a.azimuth_deg.toLocaleString("id-ID")}°; hadap panel asumsi`},{label:"Kemiringan",nilai:`${a.tilt_deg}° · asumsi`},{label:"Model",nilai:a.model_version},{label:"Skor penyaringan",nilai:a.confidence.toLocaleString("id-ID",{maximumFractionDigits:3})}]}/>
          <p className={s.penjelasanTahap}>Skor belum dikalibrasi sebagai akurasi atap.</p>
        </details>}
      </aside>);

  const isi = <div ref={wadahRef} className={s.wadah} role={mode === "modal" ? "dialog" : undefined} aria-modal={mode === "modal" ? true : undefined} aria-labelledby="judul-pemindai">
    <header className={s.kepala}>
      <Judul id="judul-pemindai" className={s.judul}>Analisis atap</Judul>
      {mode === "modal" ? <Tombol ikon={X} hanyaIkon onClick={onTutup}>Tutup pemindai</Tombol> : <Link href="/" className={kelasTombol("sekunder")}>Pilih di peta</Link>}
    </header>
    <nav className={s.stepper} aria-label="Tahap analisis">
      {TAHAP_INFO.map(step => <button key={step.nomor} type="button" className={`${s.tombolTahap} ${tahap === step.nomor ? s.tahapAktif : ""}`} aria-pressed={tahap === step.nomor} disabled={Boolean(sibuk) || (step.nomor === 2 && !a) || (step.nomor === 3 && !simulasi)} onClick={() => setTahap(step.nomor)}>
        <span className={s.tahapNomor} aria-hidden="true">0{step.nomor}</span><span className={s.tahapNama}>{step.nama}</span>
      </button>)}
    </nav>
    <label className={s.pilihBangunan}>Bangunan<select value={id} disabled={sibuk === "analisis" || sibuk === "hitung"} onChange={e => { setId(Number(e.target.value)); setTahap(1); }}>
      {!pilihan.some(b => b.id === id) && <option value={id}>Bangunan {id}</option>}
      {pilihan.map(b => <option key={b.id} value={b.id}>{namaBangunan(b)}{simulasiContoh(b.id) ? " · hasil tersimpan" : ""}</option>)}
    </select></label>
    {galat && <div role="alert" className={s.kotakPeringatan}><Ikon ikon={AlertTriangle}/><span>{galat}</span></div>}
    {sibuk && <p role="status" className={s.statusProses}>{sibuk === "analisis" ? "Membaca citra dan menjalankan analisis atap…" : sibuk === "hitung" ? "Menghitung energi dan penghematan…" : "Memuat bangunan dan hasil tersimpan…"}</p>}
    <div className={s.gridPemindai} data-tahap={tahap} aria-busy={Boolean(sibuk)}>
      {tahap === 3 ? <>{panel}{kanvas}</> : <>{kanvas}{panel}</>}
    </div>
  </div>;
  return mode === "modal" ? <div className={s.wadahModal}><div className={s.kartuModal}>{isi}</div></div> : isi;
}
