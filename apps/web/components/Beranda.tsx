"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowDown, ArrowUpRight, Building2, Check, ChevronDown, ChevronRight, GraduationCap, House, List, Map, MapPin, Search, Store, X } from "lucide-react";
import type { BangunanRingkas } from "@petasurya/contracts";
import { Ikon, PanelLipat, Tombol, kelasTautan, m2 } from "@petasurya/ui";
import { Peta, type BangunanPeta } from "./Peta";
import { JejakKawasan } from "./JejakKawasan";
import { bangunanDiArea, GalatPemindaian, indeksHasil } from "../lib/api";
import { BATAS_KOTA, namaBangunan, simulasiContoh } from "../lib/pemindaian";
import { cariBangunan, tautanKatalog, urutkanBangunan, type FilterBangunan, type PilihanKatalog, type UrutanBangunan } from "../lib/pencarian";
import s from "./beranda.module.css";

const CONTOH = [
  { id: 1145010599, nama: "Rumah", ikon: House },
  { id: 991016391, nama: "Toko", ikon: Store },
  { id: 1146141501, nama: "Kampus", ikon: GraduationCap },
];

export function BerandaInteraktif({ bangunan, query, filterAwal = "semua", urutanAwal = "nama" }: {
  bangunan: BangunanRingkas[];
  query: string;
  filterAwal?: FilterBangunan;
  urutanAwal?: UrutanBangunan;
}) {
  const router = useRouter();
  const [daftar, setDaftar] = useState(bangunan);
  const [pencarian, setPencarian] = useState(query);
  const [cakupan, setCakupan] = useState("Katalog awal di sekitar UNIB");
  const [sibuk, setSibuk] = useState(false);
  const [galat, setGalat] = useState<string | null>(null);
  const [batasDaftar, setBatasDaftar] = useState(20);
  const [tersimpan, setTersimpan] = useState(() => new Set(bangunan.filter((b) => simulasiContoh(b.id)).map((b) => b.id)));
  const [filter, setFilter] = useState<FilterBangunan>(filterAwal);
  const [urutan, setUrutan] = useState<UrutanBangunan>(urutanAwal);
  const [tampilan, setTampilan] = useState<"peta" | "daftar">(query.trim() || filterAwal !== "semua" || urutanAwal !== "nama" ? "daftar" : "peta");
  const permintaanArea = useRef<AbortController | null>(null);

  useEffect(() => {
    let aktif = true;
    indeksHasil().then((ids) => {
      if (aktif) setTersimpan((sebelumnya) => new Set([...sebelumnya, ...ids]));
    }).catch(() => {});
    return () => { aktif = false; permintaanArea.current?.abort(); };
  }, []);
  useEffect(() => {
    setPencarian(query);
    setFilter(filterAwal);
    setUrutan(urutanAwal);
    setBatasDaftar(20);
    if (query.trim() || filterAwal !== "semua" || urutanAwal !== "nama") setTampilan("daftar");
  }, [query, filterAwal, urutanAwal]);

  const cocok = useMemo(() => cariBangunan(daftar, pencarian), [daftar, pencarian]);
  const jumlahTersimpan = useMemo(() => cocok.filter((b) => tersimpan.has(b.id)).length, [cocok, tersimpan]);
  const hasil = useMemo(() => urutkanBangunan(cocok.filter((b) => filter === "semua" || tersimpan.has(b.id)), urutan), [cocok, filter, tersimpan, urutan]);
  const jumlahTampil = Math.min(batasDaftar, hasil.length);
  const jumlahBerikut = Math.min(20, hasil.length - jumlahTampil);
  const bangunanPeta = useMemo<BangunanPeta[]>(() => hasil.map((b) => ({ id: b.id, nama: namaBangunan(b), geom: b.geom })), [hasil]);
  const pilih = useCallback((id: number) => router.push(`/pindai?id=${id}`), [router]);
  const cariArea = useCallback(async (lat: number, lon: number) => {
    permintaanArea.current?.abort();
    const permintaan = new AbortController();
    permintaanArea.current = permintaan;
    setSibuk(true);
    setGalat(null);
    try {
      const data = await bangunanDiArea(lat, lon, permintaan.signal);
      if (permintaan.signal.aborted) return;
      setDaftar(data);
      setCakupan("Radius 200 m dari pusat peta");
      setBatasDaftar(20);
    } catch (e) {
      if (permintaan.signal.aborted) return;
      setGalat(e instanceof GalatPemindaian ? e.message : "Data bangunan belum dapat diambil. Pilihan sebelumnya tetap tersedia.");
    } finally { if (!permintaan.signal.aborted) setSibuk(false); }
  }, []);

  function ubahPilihan(perubahan: Partial<PilihanKatalog>) {
    const berikut = { query: pencarian, filter, urutan, ...perubahan };
    setPencarian(berikut.query);
    setFilter(berikut.filter);
    setUrutan(berikut.urutan);
    setBatasDaftar(20);
    router.replace(tautanKatalog(berikut), { scroll: false });
  }

  function hapusPencarian(semua = false) {
    ubahPilihan({ query: "", ...(semua ? { filter: "semua" } : {}) });
    document.getElementById("cari-katalog")?.focus();
  }

  return (
    <main className={s.halaman}>
      <header className={s.kepala} data-tiba="judul">
        <div>
          <p className={s.label}>SETIAP ATAP PUNYA POTENSI</p>
          <h1 className={s.judul}>Temukan <span>atap Anda.</span></h1>
          <p className={s.pengantar}>Pilih bangunan di peta atau cari di katalog.</p>
        </div>
        <div className={s.lokasi}><span className={s.pinLokasi} data-tujuan-transisi><MapPin size={18} aria-hidden="true" /></span><span><strong>Bengkulu</strong><small>Indonesia · Area demo</small></span></div>
      </header>

      <ol className={s.alur} aria-label="Langkah analisis atap" data-tiba="judul">
        <li aria-current="step"><span>01</span><strong>Pilih bangunan</strong><ChevronRight size={14} aria-hidden="true" /></li>
        <li><span>02</span><strong>Tinjau atap</strong><ChevronRight size={14} aria-hidden="true" /></li>
        <li><span>03</span><strong>Hitung potensi</strong><ArrowUpRight size={14} aria-hidden="true" /></li>
      </ol>

      <section className={s.ruangKerja} aria-label="Peta dan pilihan bangunan" data-tampilan={tampilan}>
        <div className={s.bilahPeta} data-tiba="judul">
          <form className={s.pencarian} role="search" action="/peta" method="get" onSubmit={(event) => {
            event.preventDefault();
            ubahPilihan({ query: pencarian.trim() });
          }}>
            <Search size={18} aria-hidden="true" />
            <label className={s.srOnly} htmlFor="cari-katalog">Cari nama, jenis, atau ID bangunan</label>
            <input id="cari-katalog" name="q" type="search" placeholder="Cari rumah, toko, kampus…" value={pencarian} onChange={(event) => { setPencarian(event.target.value); setBatasDaftar(20); if (event.target.value.trim()) setTampilan("daftar"); }} onKeyDown={(event) => { if (event.key === "Escape" && pencarian) { event.preventDefault(); hapusPencarian(); } }} aria-controls="hasil-bangunan" aria-keyshortcuts="/" enterKeyHint="search" autoComplete="off" spellCheck={false} />
            {pencarian ? <button type="button" onClick={() => hapusPencarian()} aria-label="Hapus pencarian"><X size={16} aria-hidden="true" /></button> : <kbd aria-hidden="true">/</kbd>}
          </form>
          <span className={s.cakupanPeta}><span /> {cakupan === "Katalog awal di sekitar UNIB" ? "Sekitar Universitas Bengkulu" : "Area pencarian · radius 200 m"}</span>
        </div>

        <div className={s.pilihanTampilan} role="group" aria-label="Tampilan bangunan">
          <button type="button" aria-pressed={tampilan === "peta"} aria-controls="peta-bangunan" onClick={() => setTampilan("peta")}><Map size={16} aria-hidden="true" /> Peta</button>
          <button type="button" aria-pressed={tampilan === "daftar"} aria-controls="daftar-bangunan" onClick={() => setTampilan("daftar")}><List size={16} aria-hidden="true" /> Daftar <span>{hasil.length}</span></button>
        </div>

        <div className={s.barisPeta}>
          <div id="peta-bangunan" className={s.kolomPeta} data-tiba="peta">
            <Peta className={s.petaBeranda} label="Peta bangunan Kota Bengkulu" tinggi={520} bangunan={bangunanPeta} onPilihBangunan={pilih} onCariArea={cariArea} mencariArea={sibuk} batasPencarian={BATAS_KOTA} pertahankanKamera satelitAwal pratinjau={<JejakKawasan dekoratif />} />
            <div className={s.kakiPeta}><span><i /> Bangunan yang bisa dipilih</span><span>Geser untuk menjelajah <ArrowUpRight size={13} aria-hidden="true" /></span></div>
          </div>

          <aside id="daftar-bangunan" className={s.status} aria-labelledby="judul-daftar" data-tiba="panel">
            {!pencarian.trim() && filter === "semua" && <div className={s.contohCepat}>
              <div className={s.kepalaContoh}><span>Coba hasil tersimpan</span><ArrowDown size={13} aria-hidden="true" /></div>
              <div className={s.pilihanContoh}>{CONTOH.map(({ id, nama, ikon: IkonContoh }) => <Link key={id} href={`/pindai?id=${id}`}><IkonContoh size={17} strokeWidth={1.5} aria-hidden="true" /><span>{nama}</span><ArrowUpRight size={12} aria-hidden="true" /></Link>)}</div>
            </div>}

            <div className={s.kepalaDaftar}><h2 id="judul-daftar" className={s.statusJudul}>{pencarian.trim() ? "Hasil pencarian" : "Pilih bangunan"}</h2><span className={s.jumlah} aria-label={`${hasil.length} bangunan`}>{hasil.length}</span></div>
            <div className={s.filterDaftar} role="group" aria-label="Filter hasil bangunan">
              <button type="button" aria-pressed={filter === "semua"} onClick={() => ubahPilihan({ filter: "semua" })}>Semua</button>
              <button type="button" aria-pressed={filter === "tersimpan"} onClick={() => ubahPilihan({ filter: "tersimpan" })}><Check size={12} aria-hidden="true" /> Hasil tersimpan <span>{jumlahTersimpan}</span></button>
            </div>
            <div className={s.barisUrutan}>
              <label htmlFor="urut-bangunan">Urutkan</label>
              <div className={s.pilihanUrutan}>
                <select id="urut-bangunan" value={urutan} onChange={(event) => ubahPilihan({ urutan: event.target.value as UrutanBangunan })}>
                  <option value="nama">Nama A–Z</option>
                  <option value="luas-terbesar">Luas terbesar</option>
                  <option value="luas-terkecil">Luas terkecil</option>
                </select>
                <ChevronDown size={14} aria-hidden="true" />
              </div>
            </div>
            <p className={s.statusTeks}>{cakupan}</p>
            {galat && <p className={s.galat} role="alert">{galat}</p>}
            {sibuk && <p className={s.statusTeks} role="status">Mengambil bangunan dari OpenStreetMap…</p>}
            <p className={s.srOnly} role="status">{hasil.length} bangunan ditemukan.</p>

            <div id="hasil-bangunan" aria-busy={sibuk}>
              {hasil.length ? <ul className={s.daftarBangunan} aria-label="Bangunan yang bisa dianalisis">{hasil.slice(0, batasDaftar).map((b) => <li key={b.id}><Link href={`/pindai?id=${b.id}`} className={s.bangunan} aria-label={`Analisis ${namaBangunan(b)}, luas bangunan ${m2(b.footprint_m2)}`}><span className={s.ikonBangunan}><Building2 size={17} strokeWidth={1.5} aria-hidden="true" /></span><span className={s.ringkasanBangunan}><strong>{namaBangunan(b)}</strong><span>{m2(b.footprint_m2)}{tersimpan.has(b.id) && <span className={s.tersimpan}> · Tersimpan</span>}</span></span><Ikon ikon={ChevronRight} /></Link></li>)}</ul> : <div className={s.keadaanKosong}><Search size={24} strokeWidth={1.5} aria-hidden="true" /><strong>{filter === "tersimpan" ? "Belum ada hasil tersimpan yang cocok." : "Bangunan belum ditemukan."}</strong><p>{filter === "tersimpan" ? "Pilih Semua untuk melihat bangunan yang dapat dianalisis." : "Coba nama lain, jenis bangunan, atau cari area pada peta."}</p>{(pencarian || filter !== "semua") && <button type="button" onClick={() => hapusPencarian(true)}>Tampilkan semua bangunan <ArrowUpRight size={14} aria-hidden="true" /></button>}</div>}
            </div>

            {hasil.length > 0 && <p className={s.jumlahTampil} role="status">Menampilkan {jumlahTampil.toLocaleString("id-ID")} dari {hasil.length.toLocaleString("id-ID")} bangunan</p>}
            {jumlahBerikut > 0 && <Tombol varian="sekunder" onClick={() => setBatasDaftar((n) => n + 20)}>Tampilkan {jumlahBerikut} lagi</Tombol>}
            {cakupan !== "Katalog awal di sekitar UNIB" && <Tombol varian="sekunder" onClick={() => { permintaanArea.current?.abort(); setSibuk(false); setDaftar(bangunan); setCakupan("Katalog awal di sekitar UNIB"); ubahPilihan({ filter: "semua" }); setGalat(null); }}>Kembali ke katalog awal</Tombol>}
            <div className={s.tentangData}><PanelLipat judul="Cakupan & sumber"><p>{bangunan.length} bangunan pada katalog lokal, {tersimpan.size} hasil tersimpan. Bangunan lain dianalisis saat dipilih.</p><p>Geser peta, lalu pilih “Cari area ini” untuk bangunan lainnya. Citra dan pengambilan bangunan memerlukan internet. Cuaca memakai acuan Bengkulu 2024.</p><Link href="/sumber-data" className={kelasTautan()}>Lihat sumber data</Link></PanelLipat></div>
          </aside>
        </div>
      </section>
      <p className={s.catatan}><span>01 / PILIH BANGUNAN</span> Estimasi awal potensi PLTS. Kondisi atap perlu ditinjau di lapangan.</p>
      <Link href="/kota/1771" className={s.tautanKota}><Map size={16} aria-hidden="true" /><span>Melihat potensi satu kota? <strong>Buka Mode Kota</strong></span><ArrowUpRight size={16} aria-hidden="true" /></Link>
    </main>
  );
}
