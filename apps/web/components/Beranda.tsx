"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowDownUp, ArrowUpRight, Building2, Check, ChevronDown, ChevronRight, GraduationCap, House, List, Map, MapPin, Search, Store, X } from "lucide-react";
import { Ikon, PanelLipat, Tombol, kelasTautan, m2 } from "@petasurya/ui";
import { Peta, type BangunanPeta } from "./Peta";
import { JejakKawasan } from "./JejakKawasan";
import { bangunanDiArea, GalatPemindaian, indeksHasil, muatKatalog } from "../lib/api";
import { BATAS_KOTA, KATALOG_BANGUNAN, namaBangunan, simulasiContoh } from "../lib/pemindaian";
import { cariBangunan, tautanKatalog, urutkanBangunan, type FilterBangunan, type PilihanKatalog, type UrutanBangunan } from "../lib/pencarian";
import s from "./beranda.module.css";

const CONTOH = [
  { id: 1145010599, nama: "Rumah", ikon: House },
  { id: 991016391, nama: "Toko", ikon: Store },
  { id: 1146141501, nama: "Kampus", ikon: GraduationCap },
];

export function BerandaInteraktif({ query, filterAwal = "semua", urutanAwal = "nama" }: {
  query: string;
  filterAwal?: FilterBangunan;
  urutanAwal?: UrutanBangunan;
}) {
  const router = useRouter();
  const [katalog, setKatalog] = useState(KATALOG_BANGUNAN);
  const [daftar, setDaftar] = useState(KATALOG_BANGUNAN);
  const [pencarian, setPencarian] = useState(query);
  const [areaPeta, setAreaPeta] = useState(false);
  const [sibuk, setSibuk] = useState(false);
  const [galat, setGalat] = useState<string | null>(null);
  const [batasDaftar, setBatasDaftar] = useState(20);
  const [tersimpan, setTersimpan] = useState(() => new Set(KATALOG_BANGUNAN.filter((b) => simulasiContoh(b.id)).map((b) => b.id)));
  const [filter, setFilter] = useState<FilterBangunan>(filterAwal);
  const [urutan, setUrutan] = useState<UrutanBangunan>(urutanAwal);
  const [tampilan, setTampilan] = useState<"peta" | "daftar">(query.trim() || filterAwal !== "semua" || urutanAwal !== "nama" ? "daftar" : "peta");
  const permintaanArea = useRef<AbortController | null>(null);

  useEffect(() => {
    let aktif = true;
    indeksHasil().then((ids) => {
      if (aktif) setTersimpan((sebelumnya) => new Set([...sebelumnya, ...ids]));
    }).catch(() => {});
    // Katalog engine = katalog lokal + bangunan yang pernah diambil dari OSM; gagal berarti tetap lokal.
    muatKatalog().then((data) => {
      if (!aktif) return;
      setKatalog(data);
      setDaftar((sebelumnya) => sebelumnya === KATALOG_BANGUNAN ? data : sebelumnya);
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
      setAreaPeta(true);
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
      <header className={s.kepala}>
        <h1 className={s.judul}>Temukan <span>atap Anda.</span></h1>
        <p className={s.lokasi}><MapPin size={15} aria-hidden="true" /><strong>Bengkulu</strong><span>Area demo</span></p>
      </header>

      <ol className={s.alur} aria-label="Langkah analisis atap">
        <li aria-current="step"><span>01</span><strong>Pilih bangunan</strong></li>
        <li><span>02</span><strong>Tinjau atap</strong></li>
        <li><span>03</span><strong>Hitung potensi</strong></li>
      </ol>

      <section className={s.ruangKerja} aria-label="Peta dan pilihan bangunan" data-tampilan={tampilan}>
        <div className={s.bilahPeta}>
          <form className={s.pencarian} role="search" action="/peta" method="get" onSubmit={(event) => {
            event.preventDefault();
            ubahPilihan({ query: pencarian.trim() });
          }}>
            <Search size={18} aria-hidden="true" />
            <label className={s.srOnly} htmlFor="cari-katalog">Cari nama, jenis, atau ID bangunan</label>
            <input id="cari-katalog" name="q" type="search" placeholder="Cari rumah, toko, kampus…" value={pencarian} onChange={(event) => { setPencarian(event.target.value); setBatasDaftar(20); if (event.target.value.trim()) setTampilan("daftar"); }} onKeyDown={(event) => { if (event.key === "Escape" && pencarian) { event.preventDefault(); hapusPencarian(); } }} aria-controls="hasil-bangunan" aria-keyshortcuts="/" enterKeyHint="search" autoComplete="off" spellCheck={false} />
            {pencarian ? <button type="button" onClick={() => hapusPencarian()} aria-label="Hapus pencarian"><X size={16} aria-hidden="true" /></button> : <kbd aria-hidden="true">/</kbd>}
          </form>
          <span className={s.cakupanPeta}><span /> {areaPeta ? "Radius 200 m dari pusat peta" : "Sekitar Universitas Bengkulu"}</span>
        </div>

        <div className={s.pilihanTampilan} role="group" aria-label="Tampilan bangunan">
          <button type="button" aria-pressed={tampilan === "peta"} aria-controls="peta-bangunan" onClick={() => setTampilan("peta")}><Map size={16} aria-hidden="true" /> Peta</button>
          <button type="button" aria-pressed={tampilan === "daftar"} aria-controls="daftar-bangunan" onClick={() => setTampilan("daftar")}><List size={16} aria-hidden="true" /> Daftar <span>{hasil.length}</span></button>
        </div>

        <div className={s.barisPeta}>
          <div id="peta-bangunan" className={s.kolomPeta}>
            <Peta className={s.petaBeranda} label="Peta bangunan Kota Bengkulu" tinggi={520} bangunan={bangunanPeta} onPilihBangunan={pilih} onCariArea={cariArea} mencariArea={sibuk} batasPencarian={BATAS_KOTA} pertahankanKamera satelitAwal pratinjau={<JejakKawasan dekoratif />} />
            <p className={s.kakiPeta}><span><i /> Bangunan yang bisa dipilih</span><span>Geser peta, lalu “Cari area ini” untuk bangunan lain</span></p>
          </div>

          <aside id="daftar-bangunan" className={s.status} aria-labelledby="judul-daftar">
            {!pencarian.trim() && filter === "semua" && <nav className={s.contohCepat} aria-label="Contoh hasil tersimpan">
              <span>Contoh</span>
              {CONTOH.map(({ id, nama, ikon: IkonContoh }) => <Link key={id} href={`/pindai?id=${id}`}><IkonContoh size={15} strokeWidth={1.6} aria-hidden="true" />{nama}</Link>)}
            </nav>}

            <div className={s.kepalaDaftar}>
              <h2 id="judul-daftar" className={s.statusJudul}>{pencarian.trim() ? "Hasil pencarian" : "Pilih bangunan"}</h2>
              <div className={s.pilihanUrutan}>
                <ArrowDownUp size={14} aria-hidden="true" />
                <label className={s.srOnly} htmlFor="urut-bangunan">Urutkan bangunan</label>
                <select id="urut-bangunan" value={urutan} onChange={(event) => ubahPilihan({ urutan: event.target.value as UrutanBangunan })}>
                  <option value="nama">Nama A–Z</option>
                  <option value="luas-terbesar">Luas terbesar</option>
                  <option value="luas-terkecil">Luas terkecil</option>
                </select>
                <ChevronDown size={14} aria-hidden="true" />
              </div>
            </div>
            <div className={s.filterDaftar} role="group" aria-label="Filter hasil bangunan">
              <button type="button" aria-pressed={filter === "semua"} onClick={() => ubahPilihan({ filter: "semua" })}>Semua <span>{cocok.length.toLocaleString("id-ID")}</span></button>
              <button type="button" aria-pressed={filter === "tersimpan"} onClick={() => ubahPilihan({ filter: "tersimpan" })}><Check size={12} aria-hidden="true" /> Hasil tersimpan <span>{jumlahTersimpan.toLocaleString("id-ID")}</span></button>
            </div>
            {galat && <p className={s.galat} role="alert">{galat}</p>}
            {sibuk && <p className={s.statusTeks} role="status">Mengambil bangunan dari OpenStreetMap…</p>}
            {areaPeta && <button type="button" className={s.kembaliKatalog} onClick={() => { permintaanArea.current?.abort(); setSibuk(false); setDaftar(katalog); setAreaPeta(false); ubahPilihan({ filter: "semua" }); setGalat(null); }}><ArrowUpRight size={14} aria-hidden="true" /> Kembali ke katalog awal</button>}
            <p className={s.srOnly} role="status">{hasil.length} bangunan ditemukan.</p>

            <div id="hasil-bangunan" className={s.gulirDaftar} aria-busy={sibuk}>
              {hasil.length ? <ul className={s.daftarBangunan} aria-label="Bangunan yang bisa dianalisis">{hasil.slice(0, batasDaftar).map((b) => <li key={b.id}><Link href={`/pindai?id=${b.id}`} className={s.bangunan} aria-label={`Analisis ${namaBangunan(b)}, luas bangunan ${m2(b.footprint_m2)}`}><span className={s.ikonBangunan}><Building2 size={17} strokeWidth={1.5} aria-hidden="true" /></span><span className={s.ringkasanBangunan}><strong>{namaBangunan(b)}</strong><span>{m2(b.footprint_m2)}{tersimpan.has(b.id) && <span className={s.tersimpan}> · Tersimpan</span>}</span></span><Ikon ikon={ChevronRight} /></Link></li>)}</ul> : <div className={s.keadaanKosong}><Search size={24} strokeWidth={1.5} aria-hidden="true" /><strong>{filter === "tersimpan" ? "Belum ada hasil tersimpan yang cocok." : "Bangunan belum ditemukan."}</strong><p>{filter === "tersimpan" ? "Pilih Semua untuk melihat bangunan yang dapat dianalisis." : "Coba nama lain, jenis bangunan, atau cari area pada peta."}</p>{(pencarian || filter !== "semua") && <button type="button" onClick={() => hapusPencarian(true)}>Tampilkan semua bangunan <ArrowUpRight size={14} aria-hidden="true" /></button>}</div>}
              {hasil.length > 0 && <div className={s.kakiDaftar}>
                <p className={s.jumlahTampil} role="status">{jumlahTampil.toLocaleString("id-ID")} dari {hasil.length.toLocaleString("id-ID")} bangunan</p>
                {jumlahBerikut > 0 && <Tombol varian="sekunder" onClick={() => setBatasDaftar((n) => n + 20)}>Tampilkan {jumlahBerikut} lagi</Tombol>}
              </div>}
            </div>

            <div className={s.tentangData}><PanelLipat judul="Cakupan & sumber"><p>{katalog.length.toLocaleString("id-ID")} bangunan pada katalog, {tersimpan.size.toLocaleString("id-ID")} hasil tersimpan. Bangunan lain dianalisis saat dipilih.</p><p>Citra dan pengambilan bangunan memerlukan internet. Cuaca memakai acuan Bengkulu 2024.</p><Link href="/sumber-data" className={kelasTautan()}>Lihat sumber data</Link></PanelLipat></div>
          </aside>
        </div>
      </section>
      <footer className={s.catatan}>
        <p>Estimasi awal potensi PLTS. Kondisi atap perlu ditinjau di lapangan.</p>
        <Link href="/kota/1771" className={s.tautanKota}><Map size={16} aria-hidden="true" /><span>Melihat potensi satu kota? <strong>Buka Mode Kota</strong></span><ArrowUpRight size={16} aria-hidden="true" /></Link>
      </footer>
    </main>
  );
}
