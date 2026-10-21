"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowDownUp, ArrowUpRight, Building2, Check, ChevronDown, ChevronRight, GraduationCap, House, List, Map, MapPin, RotateCw, Search, Store, X } from "lucide-react";
import type { BangunanRingkas, FootprintArea } from "@petasurya/contracts";
import { Ikon, PanelLipat, Tombol, kelasTautan, m2 } from "@petasurya/ui";
import { Peta, type BangunanPeta, type KameraPeta } from "./Peta";
import { JejakKawasan } from "./JejakKawasan";
import { GalatPemindaian, indeksHasil, muatFootprintArea, muatKatalog } from "../lib/api";
import { ZOOM_MUAT, gabungBangunan, memotongArea, simpanArea } from "../lib/area";
import { BATAS_KOTA, KATALOG_BANGUNAN, namaBangunan, simulasiContoh } from "../lib/pemindaian";
import { cariBangunan, tautanKatalog, urutkanBangunan, type FilterBangunan, type PilihanKatalog, type UrutanBangunan } from "../lib/pencarian";
import s from "./beranda.module.css";

const CONTOH = [
  { id: 1145010599, nama: "Rumah", ikon: House },
  { id: 991016391, nama: "Toko", ikon: Store },
  { id: 1146141501, nama: "Kampus", ikon: GraduationCap },
];
// Pusat awal di UNIB pada zoom yang langsung memuat footprint sekitarnya.
const ZOOM_AWAL = 16.4;
// Kamera yang beruntun berhenti hanya menghasilkan satu permintaan area.
const JEDA_AREA_MS = 250;
const TANGGAL = new Intl.DateTimeFormat("id-ID", { dateStyle: "long", timeZone: "UTC" });

type StatusArea =
  | { jenis: "awal" | "jauh" }
  | { jenis: "siap"; jumlah: number; terpotong: boolean }
  | { jenis: "galat"; pesan: string };

export function BerandaInteraktif({ query, filterAwal = "semua", urutanAwal = "nama" }: {
  query: string;
  filterAwal?: FilterBangunan;
  urutanAwal?: UrutanBangunan;
}) {
  const router = useRouter();
  const [katalog, setKatalog] = useState(KATALOG_BANGUNAN);
  const [area, setArea] = useState<BangunanRingkas[]>([]);
  const [kamera, setKamera] = useState<KameraPeta | null>(null);
  const [statusArea, setStatusArea] = useState<StatusArea>({ jenis: "awal" });
  const [memuatArea, setMemuatArea] = useState(false);
  const [infoArea, setInfoArea] = useState<Pick<FootprintArea, "perkiraan_rumah" | "sumber"> | null>(null);
  const [pencarian, setPencarian] = useState(query);
  const [batasDaftar, setBatasDaftar] = useState(20);
  const [tersimpan, setTersimpan] = useState(() => new Set(KATALOG_BANGUNAN.filter((b) => simulasiContoh(b.id)).map((b) => b.id)));
  const [filter, setFilter] = useState<FilterBangunan>(filterAwal);
  const [urutan, setUrutan] = useState<UrutanBangunan>(urutanAwal);
  const [tampilan, setTampilan] = useState<"peta" | "daftar">(query.trim() || filterAwal !== "semua" || urutanAwal !== "nama" ? "daftar" : "peta");
  const permintaanArea = useRef<AbortController | null>(null);
  const jadwalArea = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const statusAreaRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    let aktif = true;
    indeksHasil().then((ids) => {
      if (aktif) setTersimpan((sebelumnya) => new Set([...sebelumnya, ...ids]));
    }).catch(() => {});
    // Katalog engine = katalog lokal + bangunan yang pernah diambil atau dianalisis; gagal berarti tetap lokal.
    muatKatalog().then((data) => { if (aktif) setKatalog(data); }).catch(() => {});
    return () => { aktif = false; clearTimeout(jadwalArea.current); permintaanArea.current?.abort(); };
  }, []);
  useEffect(() => {
    setPencarian(query);
    setFilter(filterAwal);
    setUrutan(urutanAwal);
    setBatasDaftar(20);
    if (query.trim() || filterAwal !== "semua" || urutanAwal !== "nama") setTampilan("daftar");
  }, [query, filterAwal, urutanAwal]);

  const muatArea = useCallback((k: KameraPeta) => {
    clearTimeout(jadwalArea.current);
    permintaanArea.current?.abort();
    if (k.zoom < ZOOM_MUAT) {
      setMemuatArea(false);
      setStatusArea({ jenis: "jauh" });
      return;
    }
    setMemuatArea(true);
    jadwalArea.current = setTimeout(async () => {
      const permintaan = new AbortController();
      permintaanArea.current = permintaan;
      const [barat, selatan, timur, utara] = k.kotak;
      try {
        const data = await muatFootprintArea({ barat, selatan, timur, utara }, permintaan.signal);
        if (permintaan.signal.aborted) return;
        setArea((lama) => simpanArea(lama, data.bangunan));
        setInfoArea({ perkiraan_rumah: data.perkiraan_rumah, sumber: data.sumber });
        setStatusArea({ jenis: "siap", jumlah: data.jumlah, terpotong: data.terpotong });
      } catch (e) {
        if (permintaan.signal.aborted) return;
        setStatusArea({ jenis: "galat", pesan: e instanceof GalatPemindaian ? e.message : "Bangunan di area ini belum dapat dimuat." });
      } finally {
        if (!permintaan.signal.aborted) setMemuatArea(false);
      }
    }, JEDA_AREA_MS);
  }, []);
  const ubahKamera = useCallback((k: KameraPeta) => {
    setKamera(k);
    setBatasDaftar(20);
    muatArea(k);
  }, [muatArea]);

  // Katalog lebih dulu: versinya membawa nama dan contoh, sama dengan yang dibuka pemindai.
  const semua = useMemo(() => gabungBangunan(katalog, area), [katalog, area]);
  const adaKueri = Boolean(pencarian.trim());
  const cocok = useMemo(() => cariBangunan(semua, pencarian), [semua, pencarian]);
  // Tanpa kueri, daftar mengikuti area peta; kueri dan hasil tersimpan mencakup semua yang sudah dimuat.
  const diArea = useMemo(() => adaKueri || !kamera ? cocok : cocok.filter((b) => memotongArea(b, kamera.kotak)), [adaKueri, cocok, kamera]);
  const cocokTersimpan = useMemo(() => cocok.filter((b) => tersimpan.has(b.id)), [cocok, tersimpan]);
  const hasil = useMemo(() => urutkanBangunan(filter === "tersimpan" ? cocokTersimpan : diArea, urutan), [cocokTersimpan, diArea, filter, urutan]);
  const jumlahTampil = Math.min(batasDaftar, hasil.length);
  const jumlahBerikut = Math.min(20, hasil.length - jumlahTampil);
  // Peta menahan semua yang sudah dimuat agar bangunan tidak hilang-muncul saat digeser.
  const sumberPeta = filter === "semua" && !adaKueri ? semua : hasil;
  const bangunanPeta = useMemo<BangunanPeta[]>(() => sumberPeta.map((b) => ({ id: b.id, nama: namaBangunan(b), geom: b.geom, tersimpan: tersimpan.has(b.id) })), [sumberPeta, tersimpan]);
  const pilih = useCallback((id: number) => router.push(`/pindai?id=${id}`), [router]);
  const rumah = infoArea?.perkiraan_rumah;

  const pesanArea = statusArea.jenis === "jauh" ? "Perbesar peta untuk memuat bangunan"
    : statusArea.jenis === "siap" && statusArea.terpotong ? `Perbesar peta untuk melihat semua ${statusArea.jumlah.toLocaleString("id-ID")} bangunan`
    : memuatArea && !diArea.length ? "Memuat bangunan…"
    : "Geser peta untuk bangunan lain";
  const kosong = filter === "tersimpan" ? { judul: "Belum ada hasil tersimpan yang cocok.", saran: "Pilih Semua untuk melihat bangunan yang dapat dianalisis." }
    : adaKueri ? { judul: "Bangunan belum ditemukan.", saran: "Coba nama lain, jenis bangunan, atau ID." }
    : statusArea.jenis === "jauh" ? { judul: "Perbesar peta untuk memuat bangunan.", saran: null }
    : memuatArea ? { judul: "Memuat bangunan…", saran: null }
    : { judul: "Belum ada bangunan terpetakan di area ini.", saran: "Geser peta ke area lain." };

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
        <p className={s.lokasi}><MapPin size={15} aria-hidden="true" /><strong>Bengkulu</strong><span>Seluruh kota</span></p>
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
        </div>

        <div className={s.pilihanTampilan} role="group" aria-label="Tampilan bangunan">
          <button type="button" aria-pressed={tampilan === "peta"} aria-controls="peta-bangunan" onClick={() => setTampilan("peta")}><Map size={16} aria-hidden="true" /> Peta</button>
          <button type="button" aria-pressed={tampilan === "daftar"} aria-controls="daftar-bangunan" onClick={() => setTampilan("daftar")}><List size={16} aria-hidden="true" /> Daftar <span>{hasil.length.toLocaleString("id-ID")}</span></button>
        </div>

        <div className={s.barisPeta}>
          <div id="peta-bangunan" className={s.kolomPeta}>
            <Peta className={s.petaBeranda} label="Peta bangunan Kota Bengkulu" tinggi={520} bangunan={bangunanPeta} onPilihBangunan={pilih} onKameraBerubah={ubahKamera} zoomAwal={ZOOM_AWAL} kunciKamera="petasurya:kamera-peta" batasPencarian={BATAS_KOTA} pertahankanKamera satelitAwal pratinjau={<JejakKawasan dekoratif />} />
            <div className={s.kakiPeta}>
              <span className={s.legenda}><span><i /> Bangunan</span><span><i data-tersimpan="" /> Hasil tersimpan</span></span>
              {/* Satu simpul untuk kedua keadaan: fokus pindah ke sini sebelum tombol Coba lagi hilang. */}
              {statusArea.jenis === "galat"
                ? <span ref={statusAreaRef} tabIndex={-1} className={s.statusArea} role="alert">{statusArea.pesan}<button type="button" onClick={() => { statusAreaRef.current?.focus(); if (kamera) muatArea(kamera); }}><RotateCw size={12} aria-hidden="true" /> Coba lagi</button></span>
                : <span ref={statusAreaRef} tabIndex={-1} className={s.statusArea} role="status">{pesanArea}</span>}
            </div>
          </div>

          <aside id="daftar-bangunan" className={s.status} aria-labelledby="judul-daftar">
            {!adaKueri && filter === "semua" && <nav className={s.contohCepat} aria-label="Contoh hasil tersimpan">
              <span>Contoh</span>
              {CONTOH.map(({ id, nama, ikon: IkonContoh }) => <Link key={id} href={`/pindai?id=${id}`}><IkonContoh size={15} strokeWidth={1.6} aria-hidden="true" />{nama}</Link>)}
            </nav>}

            <div className={s.kepalaDaftar}>
              <h2 id="judul-daftar" className={s.statusJudul}>{adaKueri ? "Hasil pencarian" : "Pilih bangunan"}</h2>
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
              <button type="button" aria-pressed={filter === "semua"} onClick={() => ubahPilihan({ filter: "semua" })}>{adaKueri ? "Semua" : "Di peta"} <span>{diArea.length.toLocaleString("id-ID")}</span></button>
              <button type="button" aria-pressed={filter === "tersimpan"} onClick={() => ubahPilihan({ filter: "tersimpan" })}><Check size={12} aria-hidden="true" /> Hasil tersimpan <span>{cocokTersimpan.length.toLocaleString("id-ID")}</span></button>
            </div>
            <p className={s.srOnly} role="status">{hasil.length} bangunan ditemukan.</p>

            <div id="hasil-bangunan" className={s.gulirDaftar} aria-busy={memuatArea && filter === "semua" && !adaKueri}>
              {hasil.length ? <ul className={s.daftarBangunan} aria-label="Bangunan yang bisa dianalisis">{hasil.slice(0, batasDaftar).map((b) => {
                const perkiraan = b.perkiraan_jenis === "rumah";
                const disimpan = tersimpan.has(b.id);
                return <li key={b.id}><Link href={`/pindai?id=${b.id}`} className={s.bangunan} aria-label={`Analisis ${namaBangunan(b)}, luas bangunan ${m2(b.footprint_m2)}${perkiraan ? ", perkiraan rumah dari luas" : ""}${disimpan ? ", hasil tersimpan" : ""}`}><span className={s.ikonBangunan}><Building2 size={17} strokeWidth={1.5} aria-hidden="true" /></span><span className={s.ringkasanBangunan}><strong>{namaBangunan(b)}</strong><span>{m2(b.footprint_m2)}{perkiraan && <span className={s.label}> · Perkiraan rumah</span>}{disimpan && <span className={s.label}> · Tersimpan</span>}</span></span><Ikon ikon={ChevronRight} /></Link></li>;
              })}</ul> : <div className={s.keadaanKosong}><Search size={24} strokeWidth={1.5} aria-hidden="true" /><strong>{kosong.judul}</strong>{kosong.saran && <p>{kosong.saran}</p>}{(pencarian || filter !== "semua") && <button type="button" onClick={() => hapusPencarian(true)}>Tampilkan bangunan di peta <ArrowUpRight size={14} aria-hidden="true" /></button>}</div>}
              {hasil.length > 0 && <div className={s.kakiDaftar}>
                <p className={s.jumlahTampil} role="status">{jumlahTampil.toLocaleString("id-ID")} dari {hasil.length.toLocaleString("id-ID")} bangunan</p>
                {jumlahBerikut > 0 && <Tombol varian="sekunder" onClick={() => setBatasDaftar((n) => n + 20)}>Tampilkan {jumlahBerikut} lagi</Tombol>}
              </div>}
            </div>

            <div className={s.tentangData}><PanelLipat judul="Cakupan & sumber">
              <p>Footprint OpenStreetMap seluruh Kota Bengkulu{infoArea ? `, snapshot ${TANGGAL.format(new Date(infoArea.sumber.diambil))}` : ""}, dimuat sesuai area peta. {tersimpan.size.toLocaleString("id-ID")} hasil tersimpan; bangunan lain dianalisis saat dipilih.</p>
              {rumah && <p>Perkiraan rumah ditebak dari luas {m2(rumah.min_m2)}–{m2(rumah.max_m2)} pada bangunan tanpa nama, bukan dari tag OSM.</p>}
              <p>Citra satelit memerlukan internet. Cuaca memakai acuan Bengkulu 2024.</p>
              <Link href="/sumber-data" className={kelasTautan()}>Lihat sumber data</Link>
            </PanelLipat></div>
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
