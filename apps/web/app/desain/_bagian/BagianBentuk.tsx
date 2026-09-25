import { DaftarData, Label, Panel, Tabel, kwh, kwp, rupiah } from "@petasurya/ui";
import { toko } from "../_data";
import { tokenAkar, ukuranPx } from "../_token";
import { Bagian, Kode, Pelat, YaJangan } from "./Lembar";
import b from "./bentuk.module.css";

const RADIUS = [
  { token: "--r-s", pakai: "Tombol, kolom isian, segmen, lencana, legenda, tooltip, batang grafik" },
  { token: "--r-m", pakai: "Panel, pelat, bingkai tabel" },
  { token: "--radius", pakai: "Bingkai peta dan citra, sudut atas lembar bawah di ponsel" },
] as const;

const ELEVASI = [
  { tingkat: "0", nama: "Kertas", token: "--paper", pakai: "Latar halaman dan kanvas peta" },
  { tingkat: "1", nama: "Permukaan", token: "--surface + --line", pakai: "Panel, header, bingkai peta" },
  { tingkat: "2", nama: "Mengapung", token: "+ --shadow-s", pakai: "Kontrol peta, legenda di atas peta" },
  { tingkat: "3", nama: "Menutupi", token: "+ --shadow-m", pakai: "Lembar samping, tooltip grafik" },
] as const;

const LAPISAN = [
  { token: "--z-peta", isi: "Kanvas peta" },
  { token: "--z-kontrol-peta", isi: "Kontrol, legenda, dan arsiran di atas peta" },
  { token: "--z-header", isi: "Header lekat" },
  { token: "--z-lembar", isi: "Lembar samping; di ponsel menutupi header" },
  { token: "--z-tooltip", isi: "Tooltip grafik" },
] as const;

const TEMA = [
  { nama: "Terang", atribut: "light" },
  { nama: "Gelap", atribut: "dark" },
] as const;

const sim = toko.simulasi;

/** Sudut digambar 4:1. Garis putus = sudut tajam yang dibulatkan. */
function Sudut({ px }: { px: number }) {
  const u = 96;
  const o = 12;
  const R = px * 4;
  const c = o + R;
  const k = Math.SQRT1_2;
  const garis = `M ${u} ${o} H ${c} A ${R} ${R} 0 0 0 ${o} ${c} V ${u}`;
  return (
    <svg className={b.sudut} viewBox={`0 0 ${u} ${u}`} width={u} height={u} aria-hidden="true">
      <path className={b.sudutIsi} d={`${garis} H ${u} Z`} />
      <path className={b.sudutBantu} d={`M ${c} ${o} H ${o} V ${c}`} />
      <path className={b.sudutGaris} d={garis} />
      <line className={b.sudutUkur} x1={c} y1={c} x2={c - R * k} y2={c - R * k} />
      <circle className={b.sudutPusat} cx={c} cy={c} r={1.5} />
      <text className={b.sudutLabel} x={c + 5} y={c + 14}>
        R{px}
      </text>
    </svg>
  );
}

export function BagianBentuk() {
  const akar = tokenAkar();

  return (
    <Bagian
      id="bentuk"
      nomor="06"
      judul="Bentuk"
      aturan="Tiga radius dan dua bayangan. Bayangan hanya untuk yang benar-benar mengapung; selebihnya garis rambut."
    >
      <Pelat nomor="6.1" judul="Radius" keterangan="Sudut digambar pada skala 4:1. Garis putus-putus = sudut tajam asalnya.">
        <ul className={b.radius}>
          {RADIUS.map((r) => {
            const px = Number.parseFloat(akar[r.token]);
            return (
              <li key={r.token} className={b.radiusButir}>
                <Sudut px={px} />
                <p className={b.radiusNama}>
                  <Kode>{r.token}</Kode> <span className="num">{ukuranPx(akar[r.token])}</span>
                </p>
                <p className={b.radiusPakai}>{r.pakai}</p>
              </li>
            );
          })}
        </ul>
      </Pelat>

      <Pelat
        nomor="6.2"
        judul="Elevasi, dua tema"
        keterangan="Di tema gelap bayangan hampir tak terlihat. Lapisan dibedakan oleh garis dan kecerahan permukaan, jadi garis tidak pernah dihapus demi bayangan."
        polos
      >
        <div className={b.duaTema}>
          {TEMA.map((t) => (
            <div key={t.atribut} className={b.tema} data-theme={t.atribut}>
              <p className={b.temaNama}>{t.nama}</p>
              <ol className={b.tangga}>
                {ELEVASI.map((e) => (
                  <li key={e.tingkat} className={b.anak}>
                    <span className={b.ubin} data-tingkat={e.tingkat}>
                      <span className="num">{e.tingkat}</span>
                    </span>
                    <span className={b.anakTeks}>
                      <span className={b.anakNama}>{e.nama}</span>
                      <Kode>{e.token}</Kode>
                      <span>{e.pakai}</span>
                    </span>
                  </li>
                ))}
              </ol>
            </div>
          ))}
        </div>
      </Pelat>

      <Pelat nomor="6.3" judul="Urutan lapisan" keterangan="z-index hanya lewat token ini, tidak ada angka lepas di komponen." polos>
        <Tabel judul="Lapisan">
          <thead>
            <tr>
              <th scope="col">Token</th>
              <th scope="col" data-angka="">
                z-index
              </th>
              <th scope="col">Isi</th>
            </tr>
          </thead>
          <tbody>
            {LAPISAN.map((l) => (
              <tr key={l.token}>
                <th scope="row" className={b.token}>
                  <Kode>{l.token}</Kode>
                </th>
                <td data-angka="">{akar[l.token]}</td>
                <td>{l.isi}</td>
              </tr>
            ))}
          </tbody>
        </Tabel>
      </Pelat>

      <YaJangan
        ya={{
          contoh: (
            <Panel as="div" className={b.kelompok}>
              <div className={b.grup}>
                <Label aksen="surya">Energi</Label>
                <DaftarData
                  baris={[
                    { label: "Kapasitas", nilai: kwp(sim.kwp) },
                    { label: "Produksi tahun pertama", nilai: kwh(sim.e_ac_kwh_yr1) },
                  ]}
                />
              </div>
              <div className={b.grup}>
                <Label aksen="daun">Uang</Label>
                <DaftarData
                  baris={[
                    { label: "Biaya pasang", nilai: rupiah(sim.capex_idr, true) },
                    { label: "Hemat tahun pertama", nilai: rupiah(sim.savings_idr_yr1, true) },
                  ]}
                />
              </div>
            </Panel>
          ),
          alasan: "Satu panel. Kelompok dipisah label, garis rambut, dan jarak 24.",
        }}
        jangan={{
          contoh: (
            <div className={b.kartuLuar}>
              <div className={b.kartuDalam}>
                <p className={b.kartuJudul}>Energi</p>
                <p className={b.kartuIsi}>
                  {kwp(sim.kwp)} · {kwh(sim.e_ac_kwh_yr1)}
                </p>
              </div>
              <div className={b.kartuDalam}>
                <p className={b.kartuJudul}>Uang</p>
                <p className={b.kartuIsi}>
                  {rupiah(sim.capex_idr, true)} · {rupiah(sim.savings_idr_yr1, true)}
                </p>
              </div>
            </div>
          ),
          alasan:
            "Kartu di dalam kartu: tiga bingkai dan tiga bayangan untuk dua kelompok data. Bayangan di sini hiasan, bukan tanda lapisan.",
        }}
      />
    </Bagian>
  );
}
