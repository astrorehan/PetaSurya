import Link from "next/link";
import { Logo } from "@petasurya/ui";
import {
  ArrowRight,
  ArrowUpRight,
  ChartNoAxesCombined,
  Layers,
  MapPin,
  Play,
  Plus,
  ScanLine,
  ShieldCheck,
  Sun,
} from "lucide-react";
import contoh from "../../../data/fixtures/demo.json";
import { DemoPotensi } from "./DemoPotensi";
import { GerakBrand, KontrolGerak } from "./GerakBrand";
import { OrbitSurya } from "./OrbitSurya";
import { Header } from "./Header";
import { JelajahKota } from "./JelajahKota";
import { JejakKawasan, JUMLAH_BANGUNAN_AWAL } from "./JejakKawasan";
import { MaskotSurya } from "./MaskotSurya";
import s from "./halamanBrand.module.css";

const gedung = contoh.find((d) => d.bangunan.id === 1146141501)!;

const FAQ = [
  {
    pertanyaan: "Untuk siapa PetaSurya?",
    jawaban:
      "Pemilik bangunan dan UMKM dapat menilai satu atap. Perencana wilayah dapat memakai Mode Kota untuk menguji adopsi PLTS, membandingkan kecamatan, serta meninjau energi, investasi, dan emisi.",
  },
  {
    pertanyaan: "Apakah hasilnya sudah bisa menjadi rancangan pemasangan?",
    jawaban:
      "Hasilnya adalah estimasi awal. Kondisi struktur, halangan, bayangan, dan tata letak panel perlu diperiksa di lapangan. Potensi berbasis luas belum menentukan kapasitas yang dapat dipasang.",
  },
  {
    pertanyaan: "Wilayah mana yang sudah tersedia?",
    jawaban:
      "Demo saat ini mencakup Kota Bengkulu. Katalog awal berada di sekitar Universitas Bengkulu. Bangunan lain dapat diambil dari OpenStreetMap dalam radius 200 meter dari pusat peta.",
  },
  {
    pertanyaan: "Dari mana angka energi dan penghematannya?",
    jawaban:
      "Perhitungan memakai cuaca acuan Bengkulu, parameter modul, tarif, dan asumsi skenario. Rumus serta sumber tersedia pada hasil. Tarif, biaya, dan pola pemakaian dapat Anda ubah untuk menghitung ulang.",
  },
  {
    pertanyaan: "Bagaimana jika citra atau jaringan tidak tersedia?",
    jawaban:
      "Batas atap dan angka contoh yang tersimpan tetap tersedia. Citra serta pengambilan bangunan baru memerlukan internet. Saat segmentasi gagal, jejak bangunan digunakan sebagai acuan dengan peringatan yang terlihat.",
  },
];

function Merek({ ukuran = 36 }: { ukuran?: number }) {
  return (
    <Link className={s.merek} href="/" aria-label="PetaSurya, beranda">
      <Logo size={ukuran} label="" />
      <span>PetaSurya<span className={s.titikMerek}>.</span></span>
    </Link>
  );
}

export function HalamanBrand() {
  return (
    <GerakBrand>
      <a className={s.lewati} href="#isi">Lewati ke isi</a>
      <Header pencarian={false} tambahan={<KontrolGerak />} />

      <main id="isi">
        <section className={s.hero} aria-labelledby="judul-brand">
          <div className={s.salinanHero}>
            <h1 id="judul-brand" className={s.judul}>
              <span>Atapmu,</span>
              <span className={s.barisJudul}>
                <span className={s.ikonJudul} aria-hidden="true">
                  <Logo size={100} label="" />
                </span>
                dihitung.
              </span>
            </h1>
            <p className={s.deskripsiHero}>
              Kenali potensi energi dan penghematan atap Anda sebelum berinvestasi.
            </p>
            <div className={s.aksiHero}>
              <Link className={s.tombolPrimer} href="/peta">
                Temukan atap Anda <span className={s.ikonMasuk}><ArrowUpRight size={17} aria-hidden="true" /></span>
              </Link>
              <Link className={s.tombolDemo} href="/pindai?id=1146141501">
                <Play size={13} fill="currentColor" aria-hidden="true" /> Lihat demo
              </Link>
            </div>
            <p className={s.statusHero}><span aria-hidden="true" /> Demo Bengkulu · Tanpa akun</p>
          </div>

          <div className={s.panggung} data-panggung>
            <OrbitSurya />
            <div className={s.cahayaMascot} aria-hidden="true" />
            <div className={s.lapisanMascot}><div className={s.layangMascot}><MaskotSurya /></div></div>
            <span className={`${s.pillFitur} ${s.pillAtap}`}><ScanLine size={14} aria-hidden="true" /> Batas atap</span>
            <span className={`${s.pillFitur} ${s.pillEnergi}`}><Sun size={14} aria-hidden="true" /> Potensi energi</span>
            <span className={`${s.pillFitur} ${s.pillBiaya}`}><ChartNoAxesCombined size={14} aria-hidden="true" /> Skenario biaya</span>
            <span className={`${s.pillFitur} ${s.pillSumber}`}><ShieldCheck size={14} aria-hidden="true" /> Angka bersumber</span>
          </div>
          <a className={s.penunjuk} href="#potensi"><span>Lihat potensinya</span><ArrowRight size={13} aria-hidden="true" /></a>
        </section>

        <section id="potensi" className={s.bagianPotensi} aria-labelledby="judul-potensi">
          <div className={s.kepalaPotensi} data-reveal="judul">
            <div>
              <h2 id="judul-potensi">Ada potensi.<br /><span>Mari kita hitung.</span></h2>
            </div>
            <p>Satu atap, gambaran yang lebih jelas.<br />Luas, energi, dan biaya dalam satu alur.</p>
          </div>
          <DemoPotensi
            nama={gedung.bangunan.nama ?? "Fakultas Hukum UNIB"}
            luas={gedung.analisis.roof_area_m2}
            kapasitas={gedung.simulasi.kwp}
            energi={gedung.simulasi.e_ac_kwh_yr1}
            hemat={gedung.simulasi.savings_idr_yr1}
            biaya={gedung.simulasi.capex_idr}
            payback={gedung.simulasi.payback_years}
            bulanan={gedung.simulasi.monthly_kwh}
            footprint={gedung.viewer.footprint}
            mask={gedung.viewer.mask_rings}
            lebar={gedung.viewer.bingkai.lebar}
            tinggi={gedung.viewer.bingkai.tinggi}
          />
          <div className={s.catatanPotensi}>
            <span><Layers size={14} aria-hidden="true" /> Contoh perhitungan seluruh luas layak · bukan rancangan pemasangan</span>
            <Link href="/atap/1146141501">Lihat asumsi &amp; cara hitung <ArrowUpRight size={14} aria-hidden="true" /></Link>
          </div>
        </section>

        <section className={s.bagianAlur} aria-labelledby="judul-alur">
          <div className={s.kepalaAlur} data-reveal="judul">
            <h2 id="judul-alur">Satu atap.<br /><span>Tiga langkah.</span></h2>
            <Link className={s.tautanTeks} href="/peta">Temukan bangunan Anda <ArrowUpRight size={16} aria-hidden="true" /></Link>
          </div>
          <ol className={s.daftarLangkah}>
            {[
              { nomor: "01", ikon: MapPin, judul: "Pilih bangunannya.", teks: "Temukan bangunan pada peta. Mulai dari rumah, tempat usaha, atau aset Anda." },
              { nomor: "02", ikon: ScanLine, judul: "Tinjau batasnya.", teks: "Lihat kontur atap dan luas yang terbaca. Ketahui batas analisis sebelum melangkah." },
              { nomor: "03", ikon: ChartNoAxesCombined, judul: "Uji skenarionya.", teks: "Pilih kapasitas. Ubah tarif dan biaya. Bandingkan potensi energi dengan kebutuhan Anda." },
            ].map(({ nomor, ikon: Ikon, judul, teks }) => (
              <li key={nomor} data-reveal="langkah">
                <span className={s.nomorLangkah}>{nomor}</span>
                <div><h3>{judul}</h3><p>{teks}</p></div>
                <Ikon className={s.ikonLangkah} size={23} strokeWidth={1.5} aria-hidden="true" />
              </li>
            ))}
          </ol>
        </section>

        <JelajahKota />

        <section id="faq" className={s.bagianFaq} aria-labelledby="judul-faq">
          <div data-reveal="judul">
            <h2 id="judul-faq">Pertanyaan?<br /><span>Ada jawabannya.</span></h2>
            <Link className={s.tautanTeks} href="/metodologi">Kenali cara kami menghitung <ArrowUpRight size={15} aria-hidden="true" /></Link>
          </div>
          <div className={s.daftarFaq} data-reveal="judul">
            {FAQ.map(({ pertanyaan, jawaban }, i) => (
              <details key={pertanyaan} name="faq-petasurya" open={i === 0}>
                <summary>{pertanyaan}<span className={s.kontrolFaq}><Plus size={15} aria-hidden="true" /></span></summary>
                <p>{jawaban}</p>
              </details>
            ))}
          </div>
        </section>

        <section className={s.penutup} aria-labelledby="judul-penutup" data-reveal="penutup">
          <div className={s.gerbangSalinan}>
            <h2 id="judul-penutup">Sekarang,<br /><span>giliran atap Anda.</span></h2>
            <p>Peta Bengkulu sudah menanti.<br />Mulai dari satu bangunan.</p>
            <Link className={s.tombolPrimer} href="/peta">Masuk ke peta <span className={s.ikonMasuk}><ArrowUpRight size={17} aria-hidden="true" /></span></Link>
            <span className={s.gerbangCatatan}>{JUMLAH_BANGUNAN_AWAL} bangunan di katalog awal · Tanpa akun</span>
          </div>
          <div className={s.gerbangVisual} aria-hidden="true">
            <JejakKawasan className={s.jejakGerbang} dekoratif />
            <div className={s.cincinGerbang} /><div className={s.cincinGerbangDalam} />
            <div className={s.pinGerbang}><MapPin size={28} strokeWidth={1.4} /></div>
            <span className={s.labelGerbang}>BENGKULU<span>3°45′ LS · 102°16′ BT</span></span>
            <span className={s.gerbangArah}>U <ArrowUpRight size={13} /></span>
            <span className={s.gerbangBawah}><span /> JEJAK BANGUNAN OSM <ArrowUpRight size={13} /></span>
          </div>
        </section>
      </main>

      <footer className={s.footer}>
        <div className={s.footerAtas}>
          <div><Merek ukuran={30} /><p>Atapmu, dihitung.</p></div>
          <nav aria-label="Navigasi footer">
            <Link href="/peta">Peta</Link><Link href="/kota/1771">Mode Kota</Link><Link href="/metodologi">Metodologi</Link><Link href="/sumber-data">Sumber data</Link>
          </nav>
        </div>
        <div className={s.footerBawah}><span>© 2026 PETASURYA</span><span>DIBANGUN UNTUK POTENSI INDONESIA</span></div>
      </footer>
      <div className={s.signature} aria-hidden="true" data-reveal="signature"><span>PETASURYA</span></div>
    </GerakBrand>
  );
}
