"use client";

import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { CloudOff, MapPin } from "lucide-react";
import { PermintaanAgregasi, type HasilAgregasi, type WilayahAgregasi } from "@petasurya/contracts";
import { Angka, DaftarData, JejakTautan, Keadaan, Kolom, LembarSamping, PanelLipat, SKALA_KOTA_KWP, Tombol, rupiah, tahun } from "@petasurya/ui";
import { hitungAgregasi } from "../lib/api";
import { Peta, type WilayahPeta } from "./Peta";
import s from "./kota.module.css";

const angka = (n: number, desimal = 0) => new Intl.NumberFormat("id-ID", { maximumFractionDigits: desimal }).format(n);
const kapasitas = (n: number) => n >= 1000 ? `${angka(n / 1000, 2)} MWp` : `${angka(n, 2)} kWp`;
const produksi = (n: number) => n >= 1e6 ? `${angka(n / 1e6, 1)} GWh` : n >= 1000 ? `${angka(n / 1000, 1)} MWh` : `${angka(n)} kWh`;
const uang = (n: number) => n >= 1e12 ? `Rp ${angka(n / 1e12, 1)} triliun` : rupiah(n, true);
type KotaProps = { kode: string; wilayah: WilayahPeta[]; awal: HasilAgregasi };
type Jejak = keyof HasilAgregasi["jejak"];
const judulJejak: Record<Jejak, string> = { kapasitas: "Kapasitas dari luas", energi: "Produksi energi", karbon: "Emisi terhindar", ekonomi: "Investasi dan penghematan", adopsi: "Pemilihan atap" };

function formAwal(hasil: HasilAgregasi) {
  const p = hasil.permintaan;
  return { fraksi: String(p.fraksi_layak * 100), tilt: String(p.tilt_deg), azimut: String(p.azimuth_deg), scr: String(p.asumsi.scr * 100), tarif: String(p.asumsi.tarif_rp_kwh), biaya: String(p.asumsi.biaya_per_kwp / 1e6), emisi: String(p.asumsi.ef_grid_tco2_mwh) };
}

export function KotaInteraktif({ kode, wilayah, awal }: KotaProps) {
  const [hasil, setHasil] = useState(awal);
  const [permintaan, setPermintaan] = useState(awal.permintaan);
  const [isian, setIsian] = useState(() => formAwal(awal));
  const [wilayahTerpilih, setWilayahTerpilih] = useState<string | null>(null);
  const [menghitung, setMenghitung] = useState(false);
  const [galat, setGalat] = useState<string | null>(null);
  const [galatForm, setGalatForm] = useState<string | null>(null);
  const [ulang, setUlang] = useState(0);
  const [jejak, setJejak] = useState<Jejak | null>(null);
  const pilihWilayah = useCallback((id: string) => setWilayahTerpilih((sekarang) => sekarang === id ? null : id), []);
  const kelompok = useMemo(() => [...hasil.wilayah, hasil.tanpa_wilayah], [hasil]);
  const pilihan = kelompok.find((item) => item.id === wilayahTerpilih);
  const ringkasan = pilihan?.skenario ?? hasil.skenario;
  const potensi = pilihan?.potensi ?? hasil.potensi;
  const menunggu = !galat && (menghitung || JSON.stringify(permintaan) !== JSON.stringify(hasil.permintaan));
  const petaWilayah = useMemo(() => wilayah.map((w) => {
    const data = hasil.wilayah.find((item) => item.id === w.id);
    return { ...w, kwp: data && data.n_tercatat > 0 ? data.skenario.kwp : null };
  }), [wilayah, hasil]);

  useEffect(() => {
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setMenghitung(true);
      setGalat(null);
      try {
        const terbaru = await hitungAgregasi(permintaan, controller.signal);
        if (!controller.signal.aborted) setHasil(terbaru);
      } catch (error) {
        if (!controller.signal.aborted) setGalat(error instanceof Error ? error.message : "Perhitungan belum tersedia.");
      } finally {
        if (!controller.signal.aborted) setMenghitung(false);
      }
    }, 250);
    return () => { window.clearTimeout(timer); controller.abort(); };
  }, [permintaan, ulang]);

  function ubahAsumsi(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const baru = PermintaanAgregasi.safeParse({ ...permintaan,
      fraksi_layak: Number(isian.fraksi) / 100, tilt_deg: Number(isian.tilt), azimuth_deg: Number(isian.azimut),
      asumsi: { ...permintaan.asumsi, scr: Number(isian.scr) / 100, tarif_rp_kwh: Number(isian.tarif), biaya_per_kwp: Number(isian.biaya) * 1e6, ef_grid_tco2_mwh: Number(isian.emisi) },
    });
    if (!baru.success) { setGalatForm("Periksa rentang dan satuan isian."); return; }
    setGalatForm(null);
    setGalat(null);
    setPermintaan(baru.data);
  }

  function barisWilayah(item: WilayahAgregasi) {
    return <tr key={item.id} data-terpilih={item.id === wilayahTerpilih || undefined}>
      <th scope="row"><button type="button" className={s.pilihWilayah} aria-pressed={item.id === wilayahTerpilih} onClick={() => pilihWilayah(item.id)}>{item.nama}</button></th>
      <td>{angka(item.skenario.n_bangunan)}<span className={s.dari}> / {angka(item.potensi.n_bangunan)}</span></td>
      <td>{kapasitas(item.skenario.kwp)}</td>
      <td>{produksi(item.skenario.e_ac_kwh_yr1)}</td>
    </tr>;
  }

  return <main className={s.halaman}>
    <header className={s.kepala}>
      <div><p className={s.label}>MODE KOTA</p><h1 className={s.judul}>Potensi Kota Bengkulu</h1></div>
      <span className={s.metaSumber}>OSM · {new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" }).format(new Date(`${hasil.sumber.diambil}T00:00:00Z`))}</span>
    </header>
    <p className={s.batas}>Estimasi dari footprint OSM dan asumsi luas layak. Belum menjadi rancangan pemasangan.</p>

    <section className={s.ringkasan} aria-label="Hasil skenario adopsi" aria-busy={menunggu}>
      <div className={s.konteks}>
        <h2>{pilihan?.nama ?? "Seluruh cakupan kota"}</h2>
        {pilihan && <button type="button" className={s.kembali} onClick={() => setWilayahTerpilih(null)}>Seluruh kota</button>}
        <p>Hasil untuk {angka(hasil.permintaan.adopsi * 100)}% adopsi · {angka(ringkasan.n_bangunan)} atap terpilih</p>
      </div>
      <div className={s.angkaUtama}>
        <Angka label="Kapasitas terpilih" nilai={kapasitas(ringkasan.kwp)} ukuran="display" menghitung={menunggu} ucap={`${angka(ringkasan.kwp, 2)} kilowatt-peak`} keterangan={`dari estimasi ${kapasitas(potensi.kwp)} pada ${angka(potensi.n_bangunan)} atap layak`} jejak={<JejakTautan onClick={() => setJejak("kapasitas")}/>} />
        <div className={s.angkaPendamping}>
          <Angka label="Produksi tahun pertama" nilai={produksi(ringkasan.e_ac_kwh_yr1)} menghitung={menunggu} ucap={`${angka(ringkasan.e_ac_kwh_yr1)} kilowatt-jam per tahun`} jejak={<JejakTautan onClick={() => setJejak("energi")}/>} />
          <Angka label="Emisi tahun pertama" nilai={`${angka(ringkasan.co2_ton_yr1)} tCO₂`} menghitung={menunggu} ucap={`${angka(ringkasan.co2_ton_yr1)} ton karbon dioksida per tahun`} jejak={<JejakTautan onClick={() => setJejak("karbon")}/>} />
          <Angka label="Investasi skenario" nilai={uang(ringkasan.capex_idr)} menghitung={menunggu} lengkap={rupiah(ringkasan.capex_idr)} ucap={`${angka(ringkasan.capex_idr)} rupiah`} jejak={<JejakTautan onClick={() => setJejak("ekonomi")}/>} />
          <Angka label="Hemat tahun pertama" nilai={uang(ringkasan.savings_idr_yr1)} menghitung={menunggu} lengkap={rupiah(ringkasan.savings_idr_yr1)} ucap={`${angka(ringkasan.savings_idr_yr1)} rupiah per tahun`} jejak={<JejakTautan onClick={() => setJejak("ekonomi")}/>} />
        </div>
      </div>
      <p className={s.status} role="status">{menunggu ? "Menghitung skenario…" : `Median balik modal: ${ringkasan.n_bangunan === 0 ? "— (belum ada atap terpilih)" : ringkasan.payback_median_years === null ? "belum balik modal dalam umur sistem" : tahun(ringkasan.payback_median_years)}. Profil ekonomi seragam.`}</p>
    </section>

    {galat && <div className={s.galat} role="alert"><Keadaan ikon={CloudOff} nada="galat" judul={galat} aksi={<Tombol varian="sekunder" disabled={menghitung} onClick={() => setUlang((n) => n + 1)}>Coba lagi</Tombol>}>Hasil terakhir masih ditampilkan. Perubahan belum dihitung.</Keadaan></div>}
    {hasil.potensi.n_bangunan === 0 && <Keadaan ikon={MapPin} judul="Tidak ada atap layak pada skenario ini">Ubah asumsi luas layak untuk menghitung kembali.</Keadaan>}

    <div className={s.gridUtama}>
      <aside className={s.panel} aria-label="Atur skenario adopsi">
        <div className={s.barisLabel}><label htmlFor="adopsi-kota">Adopsi atap</label><output htmlFor="adopsi-kota">{angka(permintaan.adopsi * 100)}%</output></div>
        <input id="adopsi-kota" className={s.penggeser} type="range" min="0" max="100" step="1" value={Math.round(permintaan.adopsi * 100)} disabled={hasil.potensi.n_bangunan === 0} aria-describedby="catatan-adopsi" aria-valuetext={`${angka(permintaan.adopsi * 100)} persen jumlah atap layak dalam cakupan kota`} onChange={(event) => { setGalat(null); setPermintaan((p) => ({ ...p, adopsi: Number(event.target.value) / 100 })); }} />
        <p id="catatan-adopsi" className={s.petunjuk}>Persentase jumlah atap layak di seluruh cakupan kota.</p>
        <label className={s.labelUrut} htmlFor="prioritas-kota">Prioritaskan</label>
        <select id="prioritas-kota" className={s.pilihanUrut} value={permintaan.urut} onChange={(event) => { setGalat(null); setPermintaan((p) => ({ ...p, urut: event.target.value as PermintaanAgregasi["urut"] })); }}>
          <option value="kwp">Kapasitas terbesar</option><option value="payback">Balik modal tercepat</option><option value="lcoe">Biaya energi terendah</option>
        </select>
        <p className={s.petunjuk}>{permintaan.urut === "kwp" ? "Atap berkapasitas besar dipilih lebih dulu." : "Profil seragam menyamakan nilai ekonomi. ID OSM mengurai nilai seri."}</p>
        <JejakTautan onClick={() => setJejak("adopsi")}>Cara memilih atap</JejakTautan>

        <PanelLipat judul="Ubah asumsi" ringkasan={`${angka(hasil.permintaan.fraksi_layak * 100)}% luas layak · SCR ${angka(hasil.permintaan.asumsi.scr * 100)}%`}>
          <form className={s.form} onSubmit={ubahAsumsi}>
            <p className={s.petunjuk}>Asumsi berikut dipakai seragam untuk semua bangunan.</p>
            {([
              ["fraksi", "Luas layak", "%", 0, 100, 1], ["tilt", "Kemiringan panel", "°", 0, 90, 1], ["azimut", "Hadap panel dari utara", "°", 0, 360, 1], ["scr", "Pemakaian langsung", "%", 0, 100, 1], ["tarif", "Tarif listrik", "Rp/kWh", 0.01, undefined, "any"], ["biaya", "Biaya pemasangan", "juta Rp/kWp", 0.001, undefined, "any"], ["emisi", "Faktor emisi grid", "tCO₂/MWh", 0.001, undefined, "any"],
            ] as const).map(([key, label, satuan, min, max, step]) => <Kolom key={key} id={`kota-${key}`} label={label} satuan={satuan} type="number" required min={min} max={max} step={step} value={isian[key]} onChange={(event) => setIsian((sebelumnya) => ({ ...sebelumnya, [key]: event.target.value }))}/>)}
            {galatForm && <p role="alert" className={s.petunjuk}>{galatForm}</p>}
            <Tombol type="submit" disabled={menghitung}>Hitung ulang</Tombol>
          </form>
        </PanelLipat>
      </aside>
      <section className={s.kartuPeta} aria-label="Kapasitas terpilih per kecamatan">
        <Peta label="Peta kapasitas terpilih per kecamatan Kota Bengkulu" tinggi={440} wilayah={petaWilayah} wilayahTerpilih={wilayahTerpilih} onPilihWilayah={pilihWilayah} />
        <div className={s.legenda} aria-label="Skala warna kapasitas terpilih dalam megawatt-peak">
          {SKALA_KOTA_KWP.map((kelas, i) => <span key={kelas.batas}><i style={{ backgroundColor: kelas.warna }} aria-hidden="true"/>{i === SKALA_KOTA_KWP.length - 1 ? "≥ " : ""}{angka(kelas.batas / 1000)}{i < SKALA_KOTA_KWP.length - 1 ? `–${angka(SKALA_KOTA_KWP[i + 1].batas / 1000)}` : ""}</span>)}<span>MWp</span>
        </div>
        <p className={s.catatanPeta}>Tiga batas kecamatan tersedia. Bangunan tanpa batas tetap masuk total kota.</p>
      </section>
    </div>

    <section className={s.daftar} aria-labelledby="judul-daftar-kecamatan">
      <div className={s.judulDaftar}><h2 id="judul-daftar-kecamatan">Sebaran atap terpilih</h2><span className={s.metaSumber}>Tahun pertama</span></div>
      <div className={s.tabelGulir} tabIndex={0} role="region" aria-label="Tabel sebaran wilayah, dapat digulir mendatar">
        <table><thead><tr><th scope="col">Wilayah</th><th scope="col">Atap terpilih / layak</th><th scope="col">Kapasitas</th><th scope="col">Produksi</th></tr></thead><tbody>{kelompok.map(barisWilayah)}</tbody><tfoot><tr><th scope="row">Total cakupan kota</th><td>{angka(hasil.skenario.n_bangunan)} / {angka(hasil.potensi.n_bangunan)}</td><td>{kapasitas(hasil.skenario.kwp)}</td><td>{produksi(hasil.skenario.e_ac_kwh_yr1)}</td></tr></tfoot></table>
      </div>
      <p className={s.catatanPeta}>{angka(hasil.cakupan.n_tanpa_wilayah)} footprint belum memiliki pasangan batas kecamatan.</p>
    </section>

    <section className={s.cakupan} aria-label="Cakupan dan sumber data">
      <PanelLipat judul="Cakupan dan sumber" ringkasan={`${angka(hasil.cakupan.n_tercatat)} footprint OSM · cuaca Bengkulu 2024`}>
        <p>{hasil.cakupan.catatan}</p>
        <DaftarData baris={[{ label: "Footprint tercatat", nilai: `${angka(hasil.cakupan.n_tercatat)} bangunan` }, { label: "Layak menurut asumsi luas", nilai: `${angka(hasil.cakupan.n_layak)} bangunan` }, { label: "Lebih kecil dari satu modul", nilai: `${angka(hasil.cakupan.n_terlalu_kecil)} bangunan` }, { label: "Tanpa batas kecamatan", nilai: `${angka(hasil.cakupan.n_tanpa_wilayah)} bangunan` }]}/>
        <p>{hasil.sumber.penerbit}. <a href={hasil.sumber.url} target="_blank" rel="noreferrer">Kueri snapshot OSM</a> · <a href="/sumber-data">Semua sumber angka</a> · <a href="/metodologi">Metodologi</a></p>
      </PanelLipat>
    </section>

    <LembarSamping terbuka={jejak !== null} onTutup={() => setJejak(null)} judul={jejak ? judulJejak[jejak] : "Cara hitung"}>
      {jejak && <><p className={s.rumus}>{hasil.jejak[jejak].rumus}</p><p>{hasil.jejak[jejak].sumber}</p>
        <DaftarData baris={[{ label: "Luas layak", nilai: `${angka(hasil.permintaan.fraksi_layak * 100)}% footprint` }, { label: "Modul", nilai: `${angka(hasil.permintaan.parameter_fisika.modul.wp)} Wp · ${angka(hasil.permintaan.parameter_fisika.modul.panjang_m, 3)} × ${angka(hasil.permintaan.parameter_fisika.modul.lebar_m, 3)} m` }, { label: "Kemiringan / hadap", nilai: `${angka(hasil.permintaan.tilt_deg)}° / ${angka(hasil.permintaan.azimuth_deg)}°` }, { label: "Pemakaian langsung", nilai: `${angka(hasil.permintaan.asumsi.scr * 100)}%` }, { label: "Umur sistem", nilai: `${angka(hasil.permintaan.asumsi.umur_tahun)} tahun` }]}/>
        <details className={s.rincian}><summary>Parameter lengkap</summary><pre>{JSON.stringify({ wilayah: kode, ...hasil.permintaan, engine_version: hasil.engine_version }, null, 2)}</pre></details>
      </>}
    </LembarSamping>
  </main>;
}
