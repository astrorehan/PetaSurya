"use client";

import Link from "next/link";
import { useMemo, useState, type ChangeEvent } from "react";
import type { AnalisisAtap, BangunanRingkas, HasilSimulasi, PaketPemindaian } from "@petasurya/contracts";
import { ParameterFisika } from "@petasurya/contracts";
import { Angka, GrafikBulanan, Ikon, Lencana, LembarSamping, Tombol, kwh, kwp, m2, persen, rupiah, tahun, ton } from "@petasurya/ui";
import { ChevronDown, Crosshair, Sigma, TriangleAlert } from "lucide-react";
import { Peta } from "./Peta";
import { PemindaiAtap } from "./PemindaiAtap";
import { GalatSimulasi, hitungUlangAtap } from "../lib/api";
import { namaBangunan } from "../lib/pemindaian";
import parameterFisikaJson from "../../../data/fixtures/parameter/fisika-contoh.json";
import s from "./hasilAtap.module.css";

const NAMA_BULAN = [
  "Januari",
  "Februari",
  "Maret",
  "April",
  "Mei",
  "Juni",
  "Juli",
  "Agustus",
  "September",
  "Oktober",
  "November",
  "Desember",
];

const PARAMETER_FISIKA_CONTOH = ParameterFisika.parse(parameterFisikaJson);

type DataAtap = {
  id: string;
  bangunan: BangunanRingkas;
  analisis: AnalisisAtap;
  simulasi: HasilSimulasi;
  pemindaian?: PaketPemindaian;
  tersimpanOffline?: boolean;
};

type JenisKeadaan = "kosong" | "galat";
type KunciJejak = "hemat" | "payback" | "kwp" | "energi" | "karbon";

type FormAsumsi = {
  golongan_tarif: string;
  daya_va: string;
  tarif_rp_kwh: string;
  scr: string;
  biaya_per_kwp: string;
  diskonto: string;
};

type JejakTampilan = {
  judul: string;
  rumus: string;
  masukan: [string, string][];
  sumber: string;
};

function tanggalCitra(tanggal: string | null) {
  if (!tanggal) return "tanggal tidak tersedia";
  const [tahunTanggal, bulan, hari] = tanggal.split("-").map(Number);
  if (!tahunTanggal || !bulan || !hari) return tanggal;
  return `${hari} ${NAMA_BULAN[bulan - 1]} ${tahunTanggal}`;
}

function namaSumberCitra(source: string) {
  return source === "esri-world-imagery" ? "Esri World Imagery" : source;
}

function angkaDesimal(nilai: number, maksimum = 2) {
  return nilai.toLocaleString("id-ID", { maximumFractionDigits: maksimum });
}

function PanelJejak({
  daftar,
  aktif,
  pilih,
  tutup,
}: {
  daftar: Record<KunciJejak, JejakTampilan>;
  aktif: KunciJejak;
  pilih: (kunci: KunciJejak) => void;
  tutup: () => void;
}) {
  const jejak = daftar[aktif];
  return (
    <LembarSamping terbuka onTutup={tutup} judul="Cara hitung">
      <label className={s.pilihJejak}>
        Perhitungan
        <select value={aktif} onChange={(event) => pilih(event.target.value as KunciJejak)}>
          {(Object.keys(daftar) as KunciJejak[]).map((key) => <option key={key} value={key}>{daftar[key].judul}</option>)}
        </select>
      </label>
      <div className={s.isiJejak}>
        <div className={s.rumus}><span className={s.subLabel}>Rumus</span><code>{jejak.rumus}</code></div>
        <dl className={s.daftarMasukan}>
          {jejak.masukan.map(([nama, nilai]) => <div key={nama}><dt>{nama}</dt><dd className="num">{nilai}</dd></div>)}
        </dl>
        <p className={s.sumberJejak}><span className={s.subLabel}>Sumber</span>{jejak.sumber}</p>
      </div>
    </LembarSamping>
  );
}

export function HasilAtap({ id, bangunan, analisis, simulasi, pemindaian, tersimpanOffline }: DataAtap) {
  const [jejakAktif, setJejakAktif] = useState<KunciJejak | null>(null);
  const [simulasiAktif, setSimulasiAktif] = useState<HasilSimulasi>(simulasi);
  const [sedangHitung, setSedangHitung] = useState(false);
  const [pesanMesin, setPesanMesin] = useState<string>("");
  const [bukaPemindai, setBukaPemindai] = useState(false);

  const [asumsi, setAsumsi] = useState<FormAsumsi>({
    golongan_tarif: simulasi.asumsi.golongan_tarif,
    daya_va: String(simulasi.asumsi.daya_va),
    tarif_rp_kwh: String(simulasi.asumsi.tarif_rp_kwh),
    scr: String(simulasi.asumsi.scr * 100),
    biaya_per_kwp: String(simulasi.asumsi.biaya_per_kwp),
    diskonto: String(simulasi.asumsi.diskonto * 100),
  });

  const rendah = analisis.confidence < 0.45;
  const modul = (simulasiAktif.parameter_fisika ?? PARAMETER_FISIKA_CONTOH).modul;
  const luasSkenario = simulasiAktif.module_count * modul.panjang_m * modul.lebar_m;
  const nama = namaBangunan(bangunan);
  const geometriSorot = analisis.mask_geojson ?? bangunan.geom;
  const jejak = useMemo<Record<KunciJejak, JejakTampilan>>(() => ({
    hemat: {
      judul: "Penghematan per tahun",
      rumus: "penghematan = E_AC × [SCR + (1−SCR) × faktor ekspor] × tarif",
      masukan: [
        ["E_AC tahun pertama", kwh(simulasiAktif.e_ac_kwh_yr1)],
        ["SCR", persen(simulasiAktif.scr)],
        ["Tarif", rupiah(simulasiAktif.asumsi.tarif_rp_kwh)],
      ],
      sumber: simulasiAktif.jejak?.ekonomi?.sumber ?? `Asumsi tarif ${simulasiAktif.asumsi.golongan_tarif}.`,
    },
    payback: {
      judul: "Waktu balik modal",
      rumus: "payback = saat arus kas bersih kumulatif mencapai CAPEX (interpolasi antar tahun)",
      masukan: [
        ["CAPEX", rupiah(simulasiAktif.capex_idr)],
        ["Penghematan tahun pertama", rupiah(simulasiAktif.savings_idr_yr1)],
        ["Umur sistem", `${simulasiAktif.asumsi.umur_tahun} tahun`],
      ],
      sumber: simulasiAktif.jejak?.ekonomi?.sumber ?? `Kalkulasi simulasi · ${simulasiAktif.engine_version}.`,
    },
    kwp: {
      judul: "Kapasitas skenario",
      rumus: "modul skenario = ⌊luas ekuivalen skenario / luas satu modul⌋; kWp = modul skenario × Wp / 1.000",
      masukan: [
        ["Luas ekuivalen skenario", m2(luasSkenario)],
        ["Luas satu modul", `${angkaDesimal(modul.panjang_m * modul.lebar_m, 3)} m²`],
        ["Modul dalam skenario", `${simulasiAktif.module_count}`],
        ["Daya satu modul", `${modul.wp} Wp`],
        ["Kapasitas skenario", kwp(simulasiAktif.kwp)],
      ],
      sumber: "Estimasi dari luas dan dimensi modul. Jumlah panel yang dapat dipasang belum dihitung; batas atap, penataan per bidang, bayangan, akses dan struktur perlu diperiksa.",
    },
    energi: {
      judul: "Produksi tahun pertama",
      rumus: simulasiAktif.parameter_fisika
        ? "P_AC = P_DC × (1−kotoran) × (1−mismatch) × (1−kabel) × η_inverter × (1−ketersediaan); E_AC = Σ P_AC / 1.000"
        : simulasiAktif.jejak?.poa.rumus ?? "POA → suhu sel → derate → E_AC",
      masukan: [
        ["POA", `${angkaDesimal(simulasiAktif.poa_kwh_m2_yr, 1)} kWh/m²/tahun`],
        ["Performance ratio", persen(simulasiAktif.pr)],
        ["Produksi AC", kwh(simulasiAktif.e_ac_kwh_yr1)],
        ...(simulasiAktif.parameter_fisika && simulasiAktif.jejak ? [
          ["NOCT modul", `${angkaDesimal(simulasiAktif.parameter_fisika.modul.t_noct)} °C`],
          ["Faktor derate", persen(simulasiAktif.jejak.derate.gabungan)],
        ] as [string, string][] : []),
      ],
      sumber: simulasiAktif.parameter_fisika && simulasiAktif.jejak
        ? `${simulasiAktif.jejak?.poa.sumber}; ${simulasiAktif.jejak?.suhu_sel.rumus}.`
        : simulasiAktif.jejak?.poa.sumber ?? `Kalkulasi simulasi · ${simulasiAktif.engine_version}.`,
    },
    karbon: {
      judul: "Emisi terhindar",
      rumus: simulasiAktif.jejak?.karbon?.rumus ?? "CO₂ = E_AC ÷ 1.000 × faktor emisi jaringan",
      masukan: [
        ["Produksi AC", kwh(simulasiAktif.e_ac_kwh_yr1)],
        ["Faktor emisi CO₂", `${angkaDesimal(simulasiAktif.asumsi.ef_grid_tco2_mwh, 2)} tCO₂/MWh`],
        ["Hasil tahun pertama", ton(simulasiAktif.co2e_ton_yr)],
      ],
      sumber: simulasiAktif.jejak?.karbon?.sumber ?? "Faktor emisi masukan skenario; sumber belum tercatat.",
    },
  }), [simulasiAktif, luasSkenario, modul.lebar_m, modul.panjang_m, modul.wp]);

  const ubahAsumsi = (kunci: keyof FormAsumsi) => (event: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setAsumsi((sebelumnya) => ({ ...sebelumnya, [kunci]: event.target.value }));
  };

  const jalankanHitungUlang = async () => {
    if (sedangHitung) return;
    setSedangHitung(true);
    setPesanMesin("Menghitung ulang…");
    try {
      const payload = {
        roof_analysis_id: analisis.roof_analysis_id,
        parameter_fisika: simulasiAktif.parameter_fisika ?? PARAMETER_FISIKA_CONTOH,
        usable_area_m2: Math.min(analisis.usable_area_m2,luasSkenario+1e-6),
        asumsi: {
          ...simulasiAktif.asumsi,
          golongan_tarif: asumsi.golongan_tarif,
          daya_va: Number(asumsi.daya_va),
          tarif_rp_kwh: Number(asumsi.tarif_rp_kwh),
          scr: Number(asumsi.scr) / 100,
          biaya_per_kwp: Number(asumsi.biaya_per_kwp),
          diskonto: Number(asumsi.diskonto) / 100,
        },
      };
      const dataBaru = await hitungUlangAtap(payload);
      setSimulasiAktif(dataBaru);
      setPesanMesin("Hasil diperbarui.");
    } catch (galat) {
      setPesanMesin(galat instanceof GalatSimulasi
        ? "Perhitungan gagal. Periksa masukan lalu coba lagi; hasil sebelumnya tetap tampil."
        : "Mesin hitung belum terhubung. Hasil sebelumnya tetap tampil.");
    } finally {
      setSedangHitung(false);
    }
  };

  return (
    <main className={s.halaman}>
      <header className={s.kepala}>
        <div className={s.labelBaris}><p className={s.label}>Hasil atap</p><Lencana>{tersimpanOffline ? "Skenario contoh tersimpan" : "Simulasi awal"}</Lencana></div>
        <h1 className={s.judul}>{nama}</h1>
        <Link className={s.tombolSekunder} href="/">Kembali ke peta</Link>
      </header>

      {rendah ? (
        <div className={s.peringatanHasil} role="alert">
          <Ikon ikon={TriangleAlert} />
          <p><strong>Keyakinan rendah.</strong> {analisis.peringatan ?? "Luas atap diperkirakan dari jejak bangunan."}</p>
        </div>
      ) : null}

      <section className={`${s.metrix} ${rendah ? s.keyakinanRendah : ""}`} aria-label="Hasil perhitungan" aria-busy={sedangHitung}>
        <div className={s.gridAngka} data-menghitung={sedangHitung || undefined}>
          <div className={s.kartuUtama}>
            <Angka label="Hemat per tahun" nilai={rupiah(simulasiAktif.savings_idr_yr1, true)} lengkap={rupiah(simulasiAktif.savings_idr_yr1)} ukuran="display" aksen="daun" menghitung={sedangHitung} />
            <div className={s.payback}>
              <Angka label="Balik modal" nilai={tahun(simulasiAktif.payback_years ?? Infinity)} menghitung={sedangHitung} />
            </div>
          </div>
          <div className={s.kartuAngka}><Angka label="Kapasitas skenario" nilai={kwp(simulasiAktif.kwp)} menghitung={sedangHitung} /></div>
          <div className={s.kartuAngka}><Angka label="Produksi per tahun" nilai={kwh(simulasiAktif.e_ac_kwh_yr1)} menghitung={sedangHitung} /></div>
          <div className={s.kartuAngka}><Angka label="Emisi terhindar per tahun" nilai={ton(simulasiAktif.co2e_ton_yr)} menghitung={sedangHitung} /></div>
        </div>
        <p className={s.sumberJejak}>{tersimpanOffline ? "Mesin belum terhubung; angka memakai skenario contoh tersimpan. " : ""}Batas atap dan kapasitas pasang belum diverifikasi.</p>
        <div className={s.aksiHasil}>
          <Tombol ikon={Sigma} onClick={() => setJejakAktif("hemat")}>Cara hitung</Tombol>
          <Tombol ikon={Crosshair} onClick={() => { setJejakAktif(null); setBukaPemindai(true); }}>Pindai atap</Tombol>
        </div>
      </section>

      <section className={s.gridLokasi} aria-label="Lokasi dan keyakinan analisis">
        <Peta className={s.petaHasil} label={`Peta ${nama}, atap tersorot`} tinggi={300} geometriSorot={geometriSorot} />
        <aside className={s.kartuKeyakinan} aria-labelledby="judul-keyakinan">
          <p className={s.label}>Batas atap</p>
          <h2 id="judul-keyakinan">{analisis.method === "cv" ? "Hasil model" : "Perkiraan OSM"}</h2>
          <details className={s.rincian}>
            <summary>Sumber analisis <Ikon ikon={ChevronDown} /></summary>
            <dl className={s.ringkasKeyakinan}>
              <div><dt>Bangunan</dt><dd>{bangunan.source_ref}</dd></div>
              <div><dt>Luas bangunan</dt><dd>{m2(bangunan.footprint_m2)}</dd></div>
              <div><dt>Metode</dt><dd>{analisis.method === "cv" ? "Analisis citra" : "Jejak bangunan"}</dd></div>
              <div><dt>Skor penyaringan</dt><dd>{angkaDesimal(analisis.confidence, 3)} / 1 · belum dikalibrasi</dd></div>
              <div><dt>Citra</dt><dd>{namaSumberCitra(analisis.imagery.source)}</dd></div>
              <div><dt>Tanggal citra</dt><dd>{tanggalCitra(analisis.imagery.date)}</dd></div>
              <div><dt>Model</dt><dd>{analisis.model_version}</dd></div>
              <div><dt>Versi hitungan</dt><dd>{simulasiAktif.engine_version}</dd></div>
            </dl>
            {analisis.catatan ? <p className={s.sumberJejak}>{analisis.catatan}</p> : null}
          </details>
        </aside>
      </section>

      <section className={s.kartuGrafik} aria-label="Produksi bulanan">
        <GrafikBulanan data={simulasiAktif.monthly_kwh} menghitung={sedangHitung} />
      </section>

      <details className={s.kartuAsumsi}>
        <summary>Ubah asumsi <Ikon ikon={ChevronDown} /></summary>
        <form id="form-asumsi" className={s.formAsumsi} onSubmit={(event) => { event.preventDefault(); void jalankanHitungUlang(); }}>
          <label>
            Golongan tarif
            <select value={asumsi.golongan_tarif} onChange={ubahAsumsi("golongan_tarif")}>
              <option>R-1/TR</option>
              <option>B-1/TR</option>
              <option>B-2/TR</option>
            </select>
          </label>
          <label>
            Daya tersambung (VA)
            <input required type="number" min="450" step="50" value={asumsi.daya_va} onChange={ubahAsumsi("daya_va")} />
          </label>
          <label>
            Tarif (Rp/kWh)
            <input required type="number" min="0.01" step="0.01" value={asumsi.tarif_rp_kwh} onChange={ubahAsumsi("tarif_rp_kwh")} />
          </label>
          <label>
            Listrik terpakai sendiri (%)
            <input required type="number" min="0" max="100" step="0.1" value={asumsi.scr} onChange={ubahAsumsi("scr")} />
          </label>
          <label>
            Biaya (Rp/kWp)
            <input required type="number" min="1" step="1" value={asumsi.biaya_per_kwp} onChange={ubahAsumsi("biaya_per_kwp")} />
          </label>
          <label>
            Diskonto (%)
            <input required type="number" min="0" max="30" step="0.1" value={asumsi.diskonto} onChange={ubahAsumsi("diskonto")} />
          </label>
        </form>
        <p className={s.sumberJejak}>
          Acuan demo: tarif dasar Permen 7/2024, tidak naik sejak 2024 (rujukan hingga September 2026).
          Biaya acuan IESR 2020: Rp14–15 juta/kWp, titik tengah Rp14,5 juta/kWp.
          {" "}<Link href="/sumber-data">Lihat sumber dan tahun data</Link>.
        </p>
        <div className={s.aksiAsumsi}>
          <button
            className={s.tombolUtama}
            type="submit"
            form="form-asumsi"
            disabled={sedangHitung}
            aria-busy={sedangHitung}
            title="Hitung ulang simulasi dengan parameter yang ditentukan"
          >
            {sedangHitung ? "Menghitung..." : "Hitung ulang"}
          </button>
          <span id="keterangan-hitung-ulang" role="status">{pesanMesin}</span>
        </div>
      </details>

      {jejakAktif ? <PanelJejak daftar={jejak} aktif={jejakAktif} pilih={setJejakAktif} tutup={() => setJejakAktif(null)} /> : null}
      {bukaPemindai ? (
        <PemindaiAtap
          bangunanAwalId={Number(id) || bangunan.id}
          paketAwal={pemindaian}
          mode="modal"
          onTutup={() => setBukaPemindai(false)}
        />
      ) : null}
    </main>
  );
}

export function KeadaanAtap({ jenis, id }: { jenis: JenisKeadaan; id: string }) {
  const galat = jenis === "galat";
  return (
    <main className={s.halaman}>
      <section className={s.keadaan} aria-labelledby="judul-keadaan">
        <p className={s.label}>{galat ? "HASIL ATAP / GALAT" : "HASIL ATAP / KOSONG"}</p>
        <h1 id="judul-keadaan" className={s.judul}>{galat ? "Hasil belum dapat dimuat." : "Bangunan belum dianalisis."}</h1>
        <p className={s.teks}>
          {galat ? "Hasil belum dapat dimuat. Coba lagi atau kembali ke peta." : `Bangunan “${id}” belum tersedia. Pilih bangunan lain di peta.`}
        </p>
        <div className={s.keadaanAksi}>
          <Link className={s.tombolUtama} href="/">Kembali ke peta</Link>
          {galat ? <Link className={s.tombolSekunder} href="/atap/contoh">Buka contoh</Link> : null}
        </div>
      </section>
    </main>
  );
}
