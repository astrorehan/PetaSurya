"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, type ChangeEvent } from "react";
import type { AnalisisAtap, BangunanRingkas, HasilSimulasi } from "@petasurya/contracts";
import { kwh, kwp, m2, persen, rupiah, tahun, ton } from "@petasurya/ui";
import { Peta } from "./Peta";
import s from "./hasilAtap.module.css";

const BULAN = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];
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

type DataAtap = {
  id: string;
  bangunan: BangunanRingkas;
  analisis: AnalisisAtap;
  simulasi: HasilSimulasi;
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

function labelKeyakinan(skor: number) {
  if (skor >= 0.7) return "tinggi";
  if (skor >= 0.45) return "sedang";
  return "rendah";
}

function angkaDesimal(nilai: number, maksimum = 2) {
  return nilai.toLocaleString("id-ID", { maximumFractionDigits: maksimum });
}

function TombolJejak({ kunci, buka }: { kunci: KunciJejak; buka: (kunci: KunciJejak) => void }) {
  return (
    <button className={s.tombolJejak} type="button" onClick={() => buka(kunci)}>
      Lihat cara hitung
    </button>
  );
}

function KartuAngka({
  judul,
  nilai,
  ariaLabel,
  kunci,
  buka,
}: {
  judul: string;
  nilai: string;
  ariaLabel: string;
  kunci: KunciJejak;
  buka: (kunci: KunciJejak) => void;
}) {
  return (
    <article className={s.kartuAngka}>
      <p className={s.angkaLabel}>{judul}</p>
      <p className={s.nilaiAngka} aria-label={ariaLabel}>{nilai}</p>
      <TombolJejak kunci={kunci} buka={buka} />
    </article>
  );
}

function GrafikBulanan({ bulanan }: { bulanan: number[] }) {
  const maksimum = Math.max(...bulanan, 1);
  const tinggiMaks = 132;
  const lebarBatang = 34;
  const jarak = 18;
  const kiri = 32;
  const dasar = 164;

  return (
    <div className={s.grafikWrap}>
      <svg
        className={s.grafik}
        viewBox="0 0 700 206"
        role="img"
        aria-labelledby="judul-grafik deskripsi-grafik"
      >
        <title id="judul-grafik">Produksi energi per bulan</title>
        <desc id="deskripsi-grafik">Batang menunjukkan produksi listrik dari Januari sampai Desember dalam kilowatt-jam.</desc>
        <line className={s.garisGrafik} x1="24" y1={dasar} x2="684" y2={dasar} />
        {bulanan.map((nilai, index) => {
          const tinggi = (nilai / maksimum) * tinggiMaks;
          const x = kiri + index * (lebarBatang + jarak);
          const y = dasar - tinggi;
          return (
            <g key={BULAN[index]}>
              <rect
                className={s.batang}
                x={x}
                y={y}
                width={lebarBatang}
                height={tinggi}
                rx="3"
                aria-hidden="true"
              />
              <text className={s.labelBatang} x={x + lebarBatang / 2} y="188" textAnchor="middle">
                {BULAN[index]}
              </text>
            </g>
          );
        })}
      </svg>
      <ul className={s.dataGrafik} aria-label="Nilai produksi bulanan">
        {bulanan.map((nilai, index) => <li key={BULAN[index]}>{BULAN[index]} <span className="num">{kwh(nilai)}</span></li>)}
      </ul>
    </div>
  );
}

function PanelJejak({ jejak, tutup }: { jejak: JejakTampilan; tutup: () => void }) {
  useEffect(() => {
    const saatTombolEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") tutup();
    };
    window.addEventListener("keydown", saatTombolEscape);
    return () => window.removeEventListener("keydown", saatTombolEscape);
  }, [tutup]);

  return (
    <div className={s.lapisanJejak}>
      <button className={s.latarJejak} type="button" aria-label="Tutup jejak perhitungan" onClick={tutup} />
      <aside className={s.panelJejak} role="dialog" aria-modal="true" aria-labelledby="judul-jejak">
        <div className={s.kepalaJejak}>
          <div>
            <p className={s.label}>JEJAK PERHITUNGAN</p>
            <h2 id="judul-jejak">{jejak.judul}</h2>
          </div>
          <button className={s.tombolTutup} type="button" aria-label="Tutup panel jejak" onClick={tutup}>×</button>
        </div>
        <div className={s.isiJejak}>
          <div className={s.rumus}>
            <span className={s.subLabel}>Rumus</span>
            <code>{jejak.rumus}</code>
          </div>
          <div>
            <span className={s.subLabel}>Masukan</span>
            <dl className={s.daftarMasukan}>
              {jejak.masukan.map(([nama, nilai]) => (
                <div key={nama}>
                  <dt>{nama}</dt>
                  <dd className="num">{nilai}</dd>
                </div>
              ))}
            </dl>
          </div>
          <p className={s.sumberJejak}><span className={s.subLabel}>Sumber</span>{jejak.sumber}</p>
        </div>
      </aside>
    </div>
  );
}

export function HasilAtap({ id, bangunan, analisis, simulasi }: DataAtap) {
  const [jejakAktif, setJejakAktif] = useState<KunciJejak | null>(null);
  const [simulasiAktif, setSimulasiAktif] = useState<HasilSimulasi>(simulasi);
  const [sedangHitung, setSedangHitung] = useState(false);
  const [pesanMesin, setPesanMesin] = useState<string>("tersedia kalkulasi mesin engine");

  const [asumsi, setAsumsi] = useState<FormAsumsi>({
    golongan_tarif: simulasi.asumsi.golongan_tarif,
    daya_va: String(simulasi.asumsi.daya_va),
    tarif_rp_kwh: String(simulasi.asumsi.tarif_rp_kwh),
    scr: String(simulasi.asumsi.scr),
    biaya_per_kwp: String(simulasi.asumsi.biaya_per_kwp),
    diskonto: String(simulasi.asumsi.diskonto),
  });

  const keyakinan = labelKeyakinan(analisis.confidence);
  const rendah = keyakinan === "rendah";
  const nama = bangunan.nama ?? `Bangunan ${id}`;
  const geometriSorot = analisis.mask_geojson ?? bangunan.geom;
  const jejak = useMemo<Record<KunciJejak, JejakTampilan>>(() => ({
    hemat: {
      judul: "Penghematan per tahun",
      rumus: "penghematan = E_AC × SCR × tarif",
      masukan: [
        ["E_AC tahun pertama", kwh(simulasiAktif.e_ac_kwh_yr1)],
        ["SCR", persen(simulasiAktif.scr)],
        ["Tarif", rupiah(simulasiAktif.asumsi.tarif_rp_kwh)],
      ],
      sumber: "Kalkulasi simulasi · asumsi tarif R-1/TR.",
    },
    payback: {
      judul: "Waktu balik modal",
      rumus: "payback = CAPEX ÷ penghematan bersih tahunan",
      masukan: [
        ["CAPEX", rupiah(simulasiAktif.capex_idr)],
        ["Penghematan tahun pertama", rupiah(simulasiAktif.savings_idr_yr1)],
        ["Umur sistem", `${simulasiAktif.asumsi.umur_tahun} tahun`],
      ],
      sumber: `Kalkulasi simulasi · ${simulasiAktif.engine_version}.`,
    },
    kwp: {
      judul: "Kapasitas terpasang",
      rumus: "kWp = jumlah modul × daya modul",
      masukan: [
        ["Jumlah modul", `${simulasiAktif.module_count} modul`],
        ["Kapasitas hasil", kwp(simulasiAktif.kwp)],
      ],
      sumber: "Kalkulasi simulasi dari respons POST /simulate.",
    },
    energi: {
      judul: "Produksi tahun pertama",
      rumus: simulasiAktif.jejak?.poa.rumus ?? "POA → suhu sel → derate → E_AC",
      masukan: [
        ["POA", `${angkaDesimal(simulasiAktif.poa_kwh_m2_yr, 1)} kWh/m²/tahun`],
        ["Performance ratio", persen(simulasiAktif.pr)],
        ["Produksi AC", kwh(simulasiAktif.e_ac_kwh_yr1)],
      ],
      sumber: simulasiAktif.jejak?.poa.sumber ?? `Kalkulasi simulasi · ${simulasiAktif.engine_version}.`,
    },
    karbon: {
      judul: "Emisi terhindar",
      rumus: "tCO₂e = E_AC ÷ 1.000 × faktor emisi jaringan",
      masukan: [
        ["Produksi AC", kwh(simulasiAktif.e_ac_kwh_yr1)],
        ["Faktor emisi", `${angkaDesimal(simulasiAktif.asumsi.ef_grid_tco2_mwh, 2)} tCO₂e/MWh`],
        ["Hasil tahun pertama", ton(simulasiAktif.co2e_ton_yr)],
      ],
      sumber: "Kalkulasi simulasi · faktor emisi Sumatera ESDM.",
    },
  }), [simulasiAktif]);

  const ubahAsumsi = (kunci: keyof FormAsumsi) => (event: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setAsumsi((sebelumnya) => ({ ...sebelumnya, [kunci]: event.target.value }));
  };

  const jalankanHitungUlang = async () => {
    setSedangHitung(true);
    setPesanMesin("menghubungi mesin...");
    try {
      const payload = {
        roof_analysis_id: analisis.roof_analysis_id,
        asumsi: {
          golongan_tarif: asumsi.golongan_tarif,
          daya_va: Number(asumsi.daya_va) || simulasiAktif.asumsi.daya_va,
          tarif_rp_kwh: Number(asumsi.tarif_rp_kwh) || simulasiAktif.asumsi.tarif_rp_kwh,
          scr: Number(asumsi.scr) || simulasiAktif.asumsi.scr,
          biaya_per_kwp: Number(asumsi.biaya_per_kwp) || simulasiAktif.asumsi.biaya_per_kwp,
          diskonto: Number(asumsi.diskonto) || simulasiAktif.asumsi.diskonto,
          eskalasi_tarif: 0.0,
          degradasi_thn: 0.006,
          umur_tahun: 25,
          ef_grid_tco2_mwh: simulasiAktif.asumsi.ef_grid_tco2_mwh,
          faktor_ekspor: 0.0,
        },
      };
      const basisUrl = process.env.NEXT_PUBLIC_ENGINE_URL || "http://localhost:8000";
      const res = await fetch(`${basisUrl}/api/v1/simulate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        const dataBaru = (await res.json()) as HasilSimulasi;
        setSimulasiAktif(dataBaru);
        setPesanMesin("kalkulasi mesin aktif");
      } else {
        setPesanMesin("mesin luring (respons galat)");
      }
    } catch {
      setPesanMesin("mesin luring — jalankan engine untuk hitung langsung");
    } finally {
      setSedangHitung(false);
    }
  };

  return (
    <main className={s.halaman}>
      <header className={s.kepala}>
        <div>
          <div className={s.labelBaris}>
            <p className={s.label}>MODE WARGA / UMKM</p>
            <span className={s.lencanaContoh}>CONTOH</span>
          </div>
          <h1 className={s.judul}>{nama}</h1>
          <p className={s.pengantar}>
            {bangunan.source_ref} · jejak {m2(bangunan.footprint_m2)} · hasil analisis atap dapat diperiksa dari sumbernya.
          </p>
        </div>
        <Link className={s.tombolSekunder} href="/">Kembali ke peta</Link>
      </header>

      <section className={s.gridLokasi} aria-label="Lokasi dan keyakinan analisis">
        <div className={s.kartuPeta}>
          <div className={s.metaPeta}>
            <div>
              <p className={s.label}>PETA · ATAP TERSOROT</p>
              <p className={s.teksMeta}>{analisis.mask_geojson ? "Poligon hasil analisis CV" : "Jejak OSM sebagai perkiraan"}</p>
            </div>
            <p className={s.citra}>
              Citra: {namaSumberCitra(analisis.imagery.source)} <span aria-hidden="true">·</span> {tanggalCitra(analisis.imagery.date)}
            </p>
          </div>
          <Peta label={`Peta ${nama}, atap tersorot`} tinggi={430} geometriSorot={geometriSorot} />
          <p className={s.catatanPeta}>
            {analisis.mask_geojson ? "Bidang amber menunjukkan mask atap dari fixture analisis." : "Mask citra tidak tersedia; bidang menunjukkan jejak bangunan OSM."}
          </p>
        </div>

        <aside className={`${s.kartuKeyakinan} ${rendah ? s.keyakinanRendah : ""}`} aria-labelledby="judul-keyakinan">
          <p className={s.label}>KEYAKINAN ANALISIS</p>
          <h2 id="judul-keyakinan"><span className="num">{angkaDesimal(analisis.confidence, 2)}</span> · {keyakinan}</h2>
          <p>{analisis.peringatan ?? analisis.catatan ?? "Mask atap tersedia dari analisis citra."}</p>
          <dl className={s.ringkasKeyakinan}>
            <div><dt>Metode</dt><dd>{analisis.method === "cv" ? "Computer vision" : "Jejak OSM"}</dd></div>
            <div><dt>Model</dt><dd className="num">{analisis.model_version}</dd></div>
          </dl>
        </aside>
      </section>

      <section className={s.metrix} aria-labelledby="judul-hasil">
        <div className={s.judulBagian}>
          <div>
            <p className={s.label}>HASIL PERHITUNGAN</p>
            <h2 id="judul-hasil">Angka yang bisa diperiksa.</h2>
          </div>
          <p className={s.versiMesin}>mesin <span className="num">{simulasiAktif.engine_version}</span></p>
        </div>

        <div className={s.gridAngka}>
          <article className={s.kartuUtama}>
            <div>
              <p className={s.angkaLabel}>Hemat per tahun</p>
              <p className={s.nilaiUtama} aria-label={`Penghematan ${rupiah(simulasiAktif.savings_idr_yr1)} per tahun`}>
                {rupiah(simulasiAktif.savings_idr_yr1, true)}
              </p>
              <TombolJejak kunci="hemat" buka={setJejakAktif} />
            </div>
            <div className={s.payback}>
              <p className={s.angkaLabel}>Balik modal</p>
              <p className={s.nilaiPayback} aria-label={`Waktu balik modal ${simulasiAktif.payback_years === null ? "tidak tercapai dalam umur sistem" : tahun(simulasiAktif.payback_years)}`}>
                {simulasiAktif.payback_years === null ? "Tidak tercapai" : tahun(simulasiAktif.payback_years)}
              </p>
              <TombolJejak kunci="payback" buka={setJejakAktif} />
            </div>
          </article>

          <KartuAngka judul="Kapasitas terpasang" nilai={kwp(simulasiAktif.kwp)} ariaLabel={`Kapasitas terpasang ${kwp(simulasiAktif.kwp)}`} kunci="kwp" buka={setJejakAktif} />
          <KartuAngka judul="Produksi tahun pertama" nilai={kwh(simulasiAktif.e_ac_kwh_yr1)} ariaLabel={`Produksi listrik ${kwh(simulasiAktif.e_ac_kwh_yr1)} per tahun`} kunci="energi" buka={setJejakAktif} />
          <KartuAngka judul="Emisi terhindar per tahun" nilai={ton(simulasiAktif.co2e_ton_yr)} ariaLabel={`Emisi terhindar ${ton(simulasiAktif.co2e_ton_yr)} per tahun`} kunci="karbon" buka={setJejakAktif} />
        </div>
      </section>

      <section className={s.kartuGrafik} aria-labelledby="judul-produksi">
        <div className={s.judulBagian}>
          <div>
            <p className={s.label}>PRODUKSI BULANAN</p>
            <h2 id="judul-produksi">Energi tahun pertama.</h2>
          </div>
          <p className={s.nilaiRingkas} aria-label={`Total produksi ${kwh(simulasiAktif.e_ac_kwh_yr1)} per tahun`}>{kwh(simulasiAktif.e_ac_kwh_yr1)}</p>
        </div>
        <GrafikBulanan bulanan={simulasiAktif.monthly_kwh} />
      </section>

      <section className={s.kartuAsumsi} aria-labelledby="judul-asumsi">
        <div className={s.judulBagian}>
          <div>
            <p className={s.label}>ASUMSI</p>
            <h2 id="judul-asumsi">Masukan yang dipakai.</h2>
          </div>
          <p className={s.teksMeta}>Dapat diubah dan dihitung ulang</p>
        </div>
        <form className={s.formAsumsi} onSubmit={(event) => { event.preventDefault(); void jalankanHitungUlang(); }}>
          <label>
            Golongan tarif
            <select value={asumsi.golongan_tarif} onChange={ubahAsumsi("golongan_tarif")}>
              <option>R-1/TR</option>
              <option>B-1/TR</option>
            </select>
          </label>
          <label>
            Daya tersambung (VA)
            <input type="number" min="450" step="50" value={asumsi.daya_va} onChange={ubahAsumsi("daya_va")} />
          </label>
          <label>
            Tarif (Rp/kWh)
            <input type="number" min="0" step="0.1" value={asumsi.tarif_rp_kwh} onChange={ubahAsumsi("tarif_rp_kwh")} />
          </label>
          <label>
            SCR (0–1)
            <input type="number" min="0" max="1" step="0.01" value={asumsi.scr} onChange={ubahAsumsi("scr")} />
          </label>
          <label>
            Biaya (Rp/kWp)
            <input type="number" min="0" step="100000" value={asumsi.biaya_per_kwp} onChange={ubahAsumsi("biaya_per_kwp")} />
          </label>
          <label>
            Diskonto (0–1)
            <input type="number" min="0" max="1" step="0.01" value={asumsi.diskonto} onChange={ubahAsumsi("diskonto")} />
          </label>
        </form>
        <div className={s.aksiAsumsi}>
          <button
            className={s.tombolUtama}
            type="button"
            onClick={jalankanHitungUlang}
            disabled={sedangHitung}
            aria-busy={sedangHitung}
            title="Hitung ulang simulasi dengan parameter yang ditentukan"
          >
            {sedangHitung ? "Menghitung..." : "Hitung ulang"}
          </button>
          <span id="keterangan-hitung-ulang">{pesanMesin}</span>
        </div>
      </section>


      <p className={s.catatanContoh}>
        Semua angka di halaman ini berasal dari fixture contoh. Angka nyata baru ditampilkan setelah mesin hitung tersambung dan sumber tarif terverifikasi.
      </p>

      {jejakAktif ? <PanelJejak jejak={jejak[jejakAktif]} tutup={() => setJejakAktif(null)} /> : null}
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
          {galat ? "Terjadi masalah saat membaca fixture hasil. Coba lagi atau kembali ke peta." : `Tidak ada fixture untuk id “${id}”. Pilih bangunan dari peta untuk melihat hasil yang tersedia.`}
        </p>
        <div className={s.keadaanAksi}>
          <Link className={s.tombolUtama} href="/">Kembali ke peta</Link>
          {galat ? <Link className={s.tombolSekunder} href="/atap/contoh">Buka contoh</Link> : null}
        </div>
      </section>
    </main>
  );
}
