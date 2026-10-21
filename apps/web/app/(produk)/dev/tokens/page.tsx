import { Logo, SKALA_KWP, kwh, kwp, m2, persen, rupiah, tahun, ton } from "@petasurya/ui";
import s from "./tokens.module.css";

// Halaman uji token. Bukan bagian produk; dipakai untuk memeriksa warna,
// huruf, format angka, dan logo di kedua tema sebelum layar sungguhan dibangun.

const PERMUKAAN = ["--paper", "--surface", "--surface-2", "--surface-3"];
const TINTA = ["--ink", "--ink-2", "--ink-3", "--line", "--line-2", "--busbar"];
const SEMANTIK = ["--pri", "--surya", "--daun", "--merah"];
const BRAND = [
  "--brand-sel",
  "--brand-sel-2",
  "--brand-busbar",
  "--brand-surya",
  "--brand-surya-2",
  "--brand-daun",
];

function Swatch({ token }: { token: string }) {
  return (
    <div className={s.swatch}>
      <div className={s.swatchWarna} style={{ background: `var(${token})` }} />
      <code className={s.swatchNama}>{token}</code>
    </div>
  );
}

export default function HalamanToken() {
  return (
    <main className={s.main}>
      <header className={s.kepala}>
        <Logo size={24} label="" />
        <span className={s.wordmark}>PetaSurya</span>
        <span className={s.meta}>halaman uji token</span>
      </header>

      <section className={s.bagian}>
        <h2 className={s.label}>Permukaan</h2>
        <div className={s.baris}>
          {PERMUKAAN.map((t) => (
            <Swatch key={t} token={t} />
          ))}
        </div>
        <h2 className={s.label}>Tinta &amp; garis</h2>
        <div className={s.baris}>
          {TINTA.map((t) => (
            <Swatch key={t} token={t} />
          ))}
        </div>
        <h2 className={s.label}>Semantik</h2>
        <div className={s.baris}>
          {SEMANTIK.map((t) => (
            <div key={t} className={s.semantik} style={{ background: `var(${t}-bg)` }}>
              <span className={s.semantikAngka} style={{ color: `var(${t})` }}>
                42,0
              </span>
              <code className={s.swatchNama}>{t}</code>
            </div>
          ))}
        </div>
        <h2 className={s.label}>Brand (konstan)</h2>
        <div className={s.baris}>
          {BRAND.map((t) => (
            <Swatch key={t} token={t} />
          ))}
        </div>
        <h2 className={s.label}>Skala peta (kWp)</h2>
        <div className={s.skala}>
          {SKALA_KWP.map((k) => (
            <div key={k.batas} className={s.skalaSel} style={{ background: k.warna }}>
              <span className={s.skalaBatas}>≥ {k.batas}</span>
            </div>
          ))}
        </div>
      </section>

      <section className={s.bagian}>
        <h2 className={s.label}>Tipografi: empat peran</h2>
        <p className={s.display}>Rp 12,1 juta</p>
        <p className={s.judul}>Hemat per tahun</p>
        <p className={s.labelContoh}>Kapasitas &amp; produksi</p>
        <p className={s.tubuh}>
          Panel asumsi dapat diubah; hasil dihitung ulang seketika. Angka yang sedang dihitung
          meredup, tidak hilang.
        </p>
        <p className={s.prosa}>
          Iradiansi pada bidang miring dihitung dengan model HDKR: komponen langsung ditransposisi
          lewat rasio kosinus, komponen difus dipisah menjadi isotropik, sirkumsolar, dan pencerahan
          horizon.
        </p>
        <table className={s.tabel}>
          <thead>
            <tr>
              <th>Besaran</th>
              <th>Nilai</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Hemat per tahun</td>
              <td className="num" title={rupiah(12118000)}>
                {rupiah(12118000, true)}
              </td>
            </tr>
            <tr>
              <td>Balik modal</td>
              <td className="num">{tahun(11.43)}</td>
            </tr>
            <tr>
              <td>Balik modal (tidak layak)</td>
              <td className="num">{tahun(31.2)}</td>
            </tr>
            <tr>
              <td>Kapasitas</td>
              <td className="num">{kwp(14.3)}</td>
            </tr>
            <tr>
              <td>Produksi</td>
              <td className="num">{kwh(19840)}</td>
            </tr>
            <tr>
              <td>Emisi terhindar</td>
              <td className="num">{ton(15.87)}</td>
            </tr>
            <tr>
              <td>Luas atap</td>
              <td className="num">{m2(96.7)}</td>
            </tr>
            <tr>
              <td>Konsumsi sendiri</td>
              <td className="num">{persen(0.42)}</td>
            </tr>
          </tbody>
        </table>
        <p className={s.meta}>angka di tabel ini contoh format, bukan hasil hitungan</p>
      </section>

      <section className={s.bagian}>
        <h2 className={s.label}>Logo 16 / 24 / 32 / 48</h2>
        <div className={s.logoBaris}>
          {[16, 24, 32, 48].map((n) => (
            <div key={n} className={s.logoSel}>
              <Logo size={n} />
              <code className={s.swatchNama}>{n}</code>
            </div>
          ))}
          <div className={s.logoSel} style={{ color: "var(--ink)" }}>
            <Logo size={48} mono />
            <code className={s.swatchNama}>mono</code>
          </div>
        </div>
      </section>
    </main>
  );
}
