import Link from "next/link";
import { ArrowUpRight, MapPin } from "lucide-react";
import ringkasan from "../../../data/fixtures/agregasi/kota-bengkulu.json";
import { bacaWilayahKota } from "../lib/wilayahKota";
import s from "./jelajahKota.module.css";

export function JelajahKota() {
  const wilayah = bacaWilayahKota();
  const poligon = wilayah.map((w) => w.geom.type === "Polygon" ? [w.geom.coordinates] : w.geom.coordinates);
  const titik = poligon.flat(3);
  const bujur = titik.map((p) => p[0]);
  const lintang = titik.map((p) => p[1]);
  const kiri = Math.min(...bujur);
  const kanan = Math.max(...bujur);
  const atas = Math.max(...lintang);
  const bawah = Math.min(...lintang);
  const koreksi = Math.cos((atas + bawah) / 2 * Math.PI / 180);
  const lebar = (kanan - kiri) * koreksi;
  const tinggi = atas - bawah;
  const skala = Math.min(352 / lebar, 284 / tinggi);
  const geserX = (400 - lebar * skala) / 2;
  const geserY = (332 - tinggi * skala) / 2;
  const garis = (ring: number[][]) => `M${ring.map(([lon, lat]) => `${((lon - kiri) * koreksi * skala + geserX).toFixed(1)},${((atas - lat) * skala + geserY).toFixed(1)}`).join("L")}Z`;
  const tanggal = new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" })
    .format(new Date(`${ringkasan.sumber.diambil}T00:00:00Z`));

  return (
    <section id="mode-kota" className={s.bagian} aria-labelledby="judul-jelajah-kota">
      <div className={s.salinan} data-reveal="judul">
        <p className={s.label}>UNTUK PERENCANA WILAYAH</p>
        <h2 id="judul-jelajah-kota">Dari satu atap,<br /><span>ke skala kota.</span></h2>
        <p className={s.deskripsi}>Uji adopsi PLTS dan bandingkan potensi kecamatan. Atur skenario energi, investasi, dan emisi Kota Bengkulu.</p>
        <dl className={s.angka}>
          <div><dt>Jejak bangunan OSM</dt><dd>{ringkasan.cakupan.n_tercatat.toLocaleString("id-ID")}</dd></div>
          <div><dt>Batas kecamatan tersedia</dt><dd>{wilayah.length.toLocaleString("id-ID")}</dd></div>
        </dl>
        <Link href="/kota/1771" className={s.tombol}>Jelajahi Mode Kota <ArrowUpRight size={17} aria-hidden="true" /></Link>
        <p className={s.catatan}>Cuplikan OSM {tanggal}. Cakupan bangunan belum lengkap.</p>
      </div>

      <figure className={s.visual} data-reveal="demo">
        <figcaption><MapPin size={14} aria-hidden="true" /><span>BENGKULU</span><span>BATAS KECAMATAN</span></figcaption>
        <div className={s.wadahPeta}>
          <svg viewBox="0 0 400 332" className={s.peta} role="img" aria-labelledby="judul-cuplikan-kota">
            <title id="judul-cuplikan-kota">{`Tiga batas kecamatan tersedia: ${wilayah.map((w) => w.nama).join(", ")}. Batas ini mencakup sebagian Kota Bengkulu.`}</title>
            <defs><pattern id="grid-jelajah-kota" width="24" height="24" patternUnits="userSpaceOnUse"><path d="M24 0H0V24" fill="none" /></pattern></defs>
            <rect width="400" height="332" fill="url(#grid-jelajah-kota)" />
            {wilayah.map((w, i) => <path key={w.id} className={s.wilayah} data-wilayah={i} d={poligon[i].flatMap((p) => p.map(garis)).join(" ")} fillRule="evenodd" vectorEffect="non-scaling-stroke"><title>{w.nama}</title></path>)}
          </svg>
          <span className={s.utara} aria-hidden="true">↑<span>U</span></span>
        </div>
        <ul className={s.legenda} aria-label="Kecamatan pada cuplikan peta">
          {wilayah.map((w, i) => <li key={w.id}><i data-wilayah={i} aria-hidden="true" />{w.nama}</li>)}
        </ul>
        <p className={s.catatanPeta}>Batas tersedia sebagian. Bangunan di luar tiga batas tetap masuk total kota.</p>
      </figure>
    </section>
  );
}
