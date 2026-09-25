"use client";

import { ChartColumn, Table2 } from "lucide-react";
import { useId, useRef, useState, type KeyboardEvent } from "react";
import { persen, ucapan } from "../format";
import { Label } from "./Angka";
import { Ikon } from "./Ikon";
import s from "./grafik.module.css";

const BULAN = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
const SINGKAT = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];

const angka = (n: number) => n.toLocaleString("id-ID", { maximumFractionDigits: 0 });

/** Langkah garis bantu "rapi" (1, 2, 2,5, 5 × 10ⁿ) untuk ±4 garis. */
export function langkahRapi(maks: number, target = 4): number {
  if (maks <= 0) return 1;
  const kasar = maks / target;
  const p = 10 ** Math.floor(Math.log10(kasar));
  const n = kasar / p;
  return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 2.5 ? 2.5 : n <= 5 ? 5 : 10) * p;
}

/**
 * Produksi bulanan: satu seri, batang ≤ 24 px berujung bulat 4 px, garis
 * bantu tipis, label langsung hanya di bulan tertinggi dan terendah.
 * Tooltip saat hover atau fokus; panah kiri/kanan berpindah bulan; tabel
 * setara tersedia dari tombol di kepala grafik.
 */
export function GrafikBulanan({
  data,
  satuan = "kWh",
  judul = "Produksi bulanan",
  menghitung = false,
}: {
  data: readonly number[];
  satuan?: string;
  judul?: string;
  menghitung?: boolean;
}) {
  const [aktif, setAktif] = useState<number | null>(null);
  const [fokus, setFokus] = useState(0);
  const [tabel, setTabel] = useState(false);
  const batang = useRef<(HTMLButtonElement | null)[]>([]);
  const idJudul = useId();

  const maks = Math.max(...data);
  const langkah = langkahRapi(maks);
  const atas = Math.ceil(maks / langkah) * langkah;
  const garis = Array.from({ length: Math.round(atas / langkah) + 1 }, (_, i) => i * langkah);
  const iMaks = data.indexOf(maks);
  const iMin = data.indexOf(Math.min(...data));
  const total = data.reduce((a, b) => a + b, 0);

  const pindah = (e: KeyboardEvent, i: number) => {
    const tujuan =
      e.key === "ArrowRight" ? Math.min(i + 1, data.length - 1)
      : e.key === "ArrowLeft" ? Math.max(i - 1, 0)
      : e.key === "Home" ? 0
      : e.key === "End" ? data.length - 1
      : null;
    if (tujuan === null) return;
    e.preventDefault();
    setFokus(tujuan);
    batang.current[tujuan]?.focus();
  };

  return (
    <figure className={s.grafik} data-menghitung={menghitung || undefined} aria-busy={menghitung || undefined}>
      <figcaption className={s.kepala}>
        <span id={idJudul}>
          <Label as="span" aksen="surya">
            {judul} <span className={s.satuanJudul}>({satuan})</span>
          </Label>
        </span>
        <span className={s.total}>
          <span className="num">{angka(total)}</span> {satuan} setahun
        </span>
        <button type="button" className={s.alih} aria-pressed={tabel} onClick={() => setTabel((t) => !t)}>
          <Ikon ikon={tabel ? ChartColumn : Table2} />
          {tabel ? "Grafik" : "Tabel"}
        </button>
      </figcaption>

      {tabel ? (
        <div className={s.bungkusTabel}>
          <table className={s.tabel} aria-labelledby={idJudul}>
            <thead>
              <tr>
                <th scope="col">Bulan</th>
                <th scope="col" data-angka="">
                  Produksi ({satuan})
                </th>
                <th scope="col" data-angka="">
                  Porsi
                </th>
              </tr>
            </thead>
            <tbody>
              {data.map((v, i) => (
                <tr key={i}>
                  <th scope="row">{BULAN[i]}</th>
                  <td data-angka="">{angka(v)}</td>
                  <td data-angka="">{persen(v / total)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <th scope="row">Setahun</th>
                <td data-angka="">{angka(total)}</td>
                <td data-angka="">100%</td>
              </tr>
            </tfoot>
          </table>
        </div>
      ) : (
        <div className={s.plot}>
          <div className={s.sumbuY} aria-hidden="true" data-lebar={angka(atas)}>
            {garis.map((g) => (
              <span key={g} style={{ bottom: `${(g / atas) * 100}%` }}>
                {angka(g)}
              </span>
            ))}
          </div>
          <div
            className={s.area}
            role="group"
            aria-labelledby={idJudul}
            aria-describedby={`${idJudul}-cara`}
            data-ada-aktif={aktif !== null || undefined}
            onPointerLeave={() => setAktif(null)}
            onBlur={(e) => {
              if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setAktif(null);
            }}
          >
            <span id={`${idJudul}-cara`} className={s.sr}>
              Panah kiri dan kanan untuk berpindah bulan.
            </span>
            {/* Garis nol = garis dasar (border area), tidak digambar dua kali. */}
            {garis.slice(1).map((g) => (
              <span key={g} className={s.garis} style={{ bottom: `${(g / atas) * 100}%` }} aria-hidden="true" />
            ))}
            {data.map((v, i) => {
              const tinggi = v / atas;
              const tandai = (i === iMaks || i === iMin) && aktif !== i;
              return (
                <button
                  key={i}
                  ref={(el) => {
                    batang.current[i] = el;
                  }}
                  type="button"
                  className={s.slot}
                  tabIndex={i === fokus ? 0 : -1}
                  aria-label={`${BULAN[i]}: ${ucapan(`${angka(v)} ${satuan}`)}`}
                  data-aktif={aktif === i || undefined}
                  onPointerEnter={() => setAktif(i)}
                  onFocus={() => {
                    setAktif(i);
                    setFokus(i);
                  }}
                  onKeyDown={(e) => pindah(e, i)}
                >
                  <span className={s.batang} style={{ height: `${tinggi * 100}%` }}>
                    {tandai && (
                      <span className={s.labelLangsung} aria-hidden="true">
                        {angka(v)}
                      </span>
                    )}
                  </span>
                </button>
              );
            })}
            {aktif !== null && (
              <div
                className={s.tooltip}
                aria-hidden="true"
                data-tepi={aktif <= 1 ? "kiri" : aktif >= data.length - 2 ? "kanan" : undefined}
                style={{
                  left: `${((aktif + 0.5) / data.length) * 100}%`,
                  bottom: `calc(${(data[aktif] / atas) * 100}% + 10px)`,
                }}
              >
                <span className={s.tooltipBulan}>{BULAN[aktif]}</span>
                <span className="num">
                  {angka(data[aktif])} {satuan}
                </span>
                <span className={s.tooltipPorsi}>{persen(data[aktif] / total)} setahun</span>
              </div>
            )}
          </div>
          <div className={s.sumbuX} aria-hidden="true">
            {SINGKAT.slice(0, data.length).map((b, i) => (
              <span key={i}>
                <span className={s.bulanPanjang}>{b}</span>
                <span className={s.bulanHuruf}>{b[0]}</span>
              </span>
            ))}
          </div>
        </div>
      )}
    </figure>
  );
}
