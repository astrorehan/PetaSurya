import Image from "next/image";
import Link from "next/link";
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
import s from "./halamanBrand.module.css";

const MASCOT = "/brand/surya-mascot.png";
const gedung = contoh.find((d) => d.bangunan.id === 1146141501)!;

const FAQ = [
  {
    pertanyaan: "Untuk siapa PetaSurya?",
    jawaban:
      "Untuk pemilik bangunan, pelaku UMKM, dan pengelola aset yang ingin menilai potensi PLTS atap. Mulai dari satu bangunan, lalu uji skenario yang sesuai kebutuhan listrik Anda.",
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
      <Image src={MASCOT} width={ukuran} height={ukuran} alt="" sizes={`${ukuran}px`} />
      <span>PetaSurya<span className={s.titikMerek}>.</span></span>
    </Link>
  );
}

export function HalamanBrand() {
  return (
    <div className={s.halaman} data-theme="dark">
      <a className={s.lewati} href="#isi">Lewati ke isi</a>
      <header className={s.header}>
        <Merek />
        <Link className={s.tautanHeader} href="/metodologi">
          Di balik hitungan <ArrowUpRight size={15} aria-hidden="true" />
        </Link>
      </header>

      <main id="isi">
        <section className={s.hero} aria-labelledby="judul-brand">
          <p className={s.eyebrow}>POTENSI SURYA, DARI ATAP ANDA</p>
          <h1 id="judul-brand" className={s.judul}>
            <span>Atapmu,</span>
            <span className={s.barisJudul}>
              <span className={s.ikonJudul} aria-hidden="true">
                <Image src={MASCOT} width={100} height={100} sizes="(max-width: 600px) 52px, 88px" alt="" priority />
              </span>
              dihitung.
            </span>
          </h1>
          <p className={s.deskripsiHero}>
            Kenali potensi energi dan penghematan atap Anda sebelum berinvestasi.
          </p>
          <div className={s.aksiHero}>
            <Link className={s.tombolPrimer} href="/peta">
              Coba PetaSurya <ArrowRight size={17} aria-hidden="true" />
            </Link>
            <Link className={s.tombolDemo} href="/pindai?id=1146141501">
              <Play size={13} fill="currentColor" aria-hidden="true" /> Lihat demo
            </Link>
          </div>
          <p className={s.statusHero}><span aria-hidden="true" /> Demo tersedia · Kota Bengkulu</p>

          <div className={s.panggung}>
            <div className={s.orbitLuar} aria-hidden="true" />
            <div className={s.orbitDalam} aria-hidden="true" />
            <div className={s.cahayaMascot} aria-hidden="true" />
            <Image
              className={s.mascotHero}
              src={MASCOT}
              width={1254}
              height={1254}
              sizes="(max-width: 600px) 340px, 520px"
              alt="Surya, karakter amber berbentuk atap dengan mata gelap dan senyum kecil."
              priority
            />
            <span className={`${s.pillFitur} ${s.pillAtap}`}><ScanLine size={14} aria-hidden="true" /> Batas atap</span>
            <span className={`${s.pillFitur} ${s.pillEnergi}`}><Sun size={14} aria-hidden="true" /> Potensi energi</span>
            <span className={`${s.pillFitur} ${s.pillBiaya}`}><ChartNoAxesCombined size={14} aria-hidden="true" /> Skenario biaya</span>
            <span className={`${s.pillFitur} ${s.pillSumber}`}><ShieldCheck size={14} aria-hidden="true" /> Angka bersumber</span>
          </div>
          <a className={s.penunjuk} href="#potensi"><span>LIHAT POTENSINYA</span><ArrowRight size={13} aria-hidden="true" /></a>
        </section>

        <section id="potensi" className={s.bagianPotensi} aria-labelledby="judul-potensi">
          <div className={s.kepalaPotensi}>
            <div>
              <p className={s.eyebrow}>DARI BANGUNAN KE KEPUTUSAN</p>
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
          <div className={s.kepalaAlur}>
            <p className={s.eyebrow}>SESEDERHANA ITU</p>
            <h2 id="judul-alur">Satu atap.<br /><span>Tiga langkah.</span></h2>
            <Link className={s.tautanTeks} href="/peta">Temukan bangunan Anda <ArrowUpRight size={16} aria-hidden="true" /></Link>
          </div>
          <ol className={s.daftarLangkah}>
            {[
              { nomor: "01", ikon: MapPin, judul: "Pilih bangunannya.", teks: "Temukan bangunan pada peta. Mulai dari rumah, tempat usaha, atau aset Anda." },
              { nomor: "02", ikon: ScanLine, judul: "Tinjau batasnya.", teks: "Lihat kontur atap dan luas yang terbaca. Ketahui batas analisis sebelum melangkah." },
              { nomor: "03", ikon: ChartNoAxesCombined, judul: "Uji skenarionya.", teks: "Pilih kapasitas. Ubah tarif dan biaya. Bandingkan potensi energi dengan kebutuhan Anda." },
            ].map(({ nomor, ikon: Ikon, judul, teks }) => (
              <li key={nomor}>
                <span className={s.nomorLangkah}>{nomor}</span>
                <div><h3>{judul}</h3><p>{teks}</p></div>
                <Ikon className={s.ikonLangkah} size={23} strokeWidth={1.5} aria-hidden="true" />
              </li>
            ))}
          </ol>
        </section>

        <section id="faq" className={s.bagianFaq} aria-labelledby="judul-faq">
          <div>
            <p className={s.eyebrow}>SEBELUM ANDA MULAI</p>
            <h2 id="judul-faq">Pertanyaan?<br /><span>Ada jawabannya.</span></h2>
            <Link className={s.tautanTeks} href="/metodologi">Kenali cara kami menghitung <ArrowUpRight size={15} aria-hidden="true" /></Link>
          </div>
          <div className={s.daftarFaq}>
            {FAQ.map(({ pertanyaan, jawaban }, i) => (
              <details key={pertanyaan} name="faq-petasurya" open={i === 0}>
                <summary>{pertanyaan}<span className={s.kontrolFaq}><Plus size={15} aria-hidden="true" /></span></summary>
                <p>{jawaban}</p>
              </details>
            ))}
          </div>
        </section>

        <section className={s.penutup} aria-labelledby="judul-penutup">
          <Image src={MASCOT} width={112} height={112} sizes="112px" alt="" />
          <h2 id="judul-penutup">Atap Anda.<br /><span>Langkah berikutnya.</span></h2>
          <Link className={s.tombolPrimer} href="/peta">Jelajahi peta <ArrowRight size={17} aria-hidden="true" /></Link>
        </section>
      </main>

      <footer className={s.footer}>
        <div className={s.footerAtas}>
          <div><Merek ukuran={30} /><p>Atapmu, dihitung.</p></div>
          <nav aria-label="Navigasi footer">
            <Link href="/peta">Peta</Link><Link href="/metodologi">Metodologi</Link><Link href="/sumber-data">Sumber data</Link>
          </nav>
        </div>
        <div className={s.footerBawah}><span>© 2026 PETASURYA</span><span>DIBANGUN UNTUK POTENSI INDONESIA</span></div>
      </footer>
      <div className={s.signature} aria-hidden="true"><span>PETASURYA</span></div>
    </div>
  );
}
