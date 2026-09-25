import { TriangleAlert } from "lucide-react";
import type { ReactNode } from "react";
import { Label, Lencana, Tabel, kontras } from "@petasurya/ui";
import { WARNA, tokenAkar, type Tema } from "../_token";
import { Bagian, Deret, Kode, Pelat, YaJangan } from "./Lembar";
import w from "./warna.module.css";

const ID = "id-ID";
const PERMUKAAN = ["--paper", "--surface", "--surface-2", "--surface-3"] as const;
const ATRIBUT: Record<Tema, "light" | "dark"> = { terang: "light", gelap: "dark" };

const LAPIS = [
  { token: "--paper", peran: "Latar halaman dan peta" },
  { token: "--surface", peran: "Panel, header, lembar samping" },
  { token: "--surface-2", peran: "Tombol disorot, isian mati" },
  { token: "--surface-3", peran: "Tombol ditekan, kerangka memuat" },
] as const;

/*
 * Pasangan dan ambang = kontras.test.ts. Yang ditampilkan rasio terendah:
 * tinta di atas keempat permukaan, warna semantik di atas --surface dan
 * latarnya sendiri, --on-pri di atas isian primer dalam tiga keadaannya.
 */
const KONTRAS = [
  { token: "--ink", tugas: "Teks dan angka", ambang: 4.5, alas: PERMUKAAN },
  { token: "--ink-2", tugas: "Teks sekunder, label", ambang: 4.5, alas: PERMUKAAN },
  { token: "--ink-3", tugas: "Metadata saja", ambang: 3, alas: PERMUKAAN },
  { token: "--pri", tugas: "Aksi, fokus", ambang: 3, alas: ["--surface", "--pri-bg"] },
  { token: "--surya", tugas: "Energi", ambang: 3, alas: ["--surface", "--surya-bg"] },
  { token: "--daun", tugas: "Uang dan CO₂", ambang: 3, alas: ["--surface", "--daun-bg"] },
  { token: "--merah", tugas: "Peringatan", ambang: 3, alas: ["--surface", "--merah-bg"] },
  { token: "--on-pri", tugas: "Label tombol primer", ambang: 4.5, alas: ["--pri", "--pri-hover", "--pri-tekan"] },
] as const;

const PERAN = [
  {
    token: "--pri",
    tugas: "Aksi",
    pakai: "Tombol primer, garis bawah tautan, cincin fokus, butir aktif",
    bukan: "Angka, grafik, hiasan",
  },
  {
    token: "--surya",
    tugas: "Energi",
    pakai: "Kunci kWp dan kWh, batang produksi, skala peta",
    bukan: "Uang, peringatan",
  },
  {
    token: "--daun",
    tugas: "Uang dan CO₂",
    pakai: "Kunci hemat dan tCO₂e, tahun hemat bersih di meter balik modal",
    bukan: "Energi, tanda “berhasil” umum",
  },
  {
    token: "--merah",
    tugas: "Peringatan",
    pakai: "Keyakinan rendah, galat, modal tidak kembali",
    bukan: "Teks kecil, hiasan",
  },
  {
    token: "--busbar",
    tugas: "Anotasi ukur",
    pakai: "Garis ukur, penanda anatomi di lembar ini",
    bukan: "Teks",
  },
] as const;

const rasio = (n: number) =>
  `${n.toLocaleString(ID, { minimumFractionDigits: 1, maximumFractionDigits: 1 })}:1`;

function terendah(tema: Tema, token: string, alas: readonly string[]): number {
  const t = WARNA[tema];
  return Math.min(...alas.map((a) => kontras(t[token], t[a])));
}

function Contoh({ tema, token }: { tema?: Tema; token: string }) {
  return (
    <span
      className={w.contoh}
      data-theme={tema ? ATRIBUT[tema] : undefined}
      style={{ background: `var(${token})` }}
      aria-hidden="true"
    />
  );
}

function Tumpukan({ tema }: { tema: Tema }) {
  const lapis = (i: number): ReactNode => {
    const l = LAPIS[i];
    return (
      <div className={w.lapis} data-lapis={i} style={{ background: `var(${l.token})` }}>
        <p className={w.lapisNama}>
          <Kode>{l.token}</Kode>
          <span className={w.hex}>{WARNA[tema][l.token]}</span>
        </p>
        <p className={w.lapisPeran}>{l.peran}</p>
        {i + 1 < LAPIS.length && lapis(i + 1)}
      </div>
    );
  };
  return (
    <div className={w.tema} data-theme={ATRIBUT[tema]}>
      <p className={w.temaNama}>{tema === "terang" ? "Terang" : "Gelap · modul di malam hari"}</p>
      {lapis(0)}
    </div>
  );
}

export function BagianWarna() {
  const akar = tokenAkar();
  const merek = Object.entries(akar).filter(([k]) => k.startsWith("--brand"));

  return (
    <Bagian
      id="warna"
      nomor="02"
      judul="Warna"
      aturan="Palet diturunkan dari modul surya: sel biru gelap, perak busbar, amber cahaya, hijau daun. Tema gelap punya token sendiri, bukan inversi."
    >
      <Pelat
        nomor="2.1"
        judul="Permukaan, dua tema"
        keterangan="Kedalaman lewat warna permukaan, bukan bayangan. Tiap lapis satu tingkat lebih terang dari yang di bawahnya; garis --line memisahkan."
      >
        <div className={w.duaTema}>
          <Tumpukan tema="terang" />
          <Tumpukan tema="gelap" />
        </div>
      </Pelat>

      <Pelat
        nomor="2.2"
        judul="Tinta dan kontras, dihitung dari tokens.css"
        keterangan="Rasio terendah tiap token di atas semua latar tempat ia dipakai. Warna semantik hanya untuk angka ≥ 24 px, ikon, isian, dan garis, jadi ambangnya 3:1. Pasangan yang sama diuji kontras.test.ts; lencana merah muncul di sini bila ada yang gagal."
        polos
      >
        <Tabel judul="Kontras token warna" gulir>
          <thead>
            <tr>
              <th scope="col">Token</th>
              <th scope="col">Tugas</th>
              <th scope="col">Terang</th>
              <th scope="col" data-angka="">
                Rasio
              </th>
              <th scope="col">Gelap</th>
              <th scope="col" data-angka="">
                Rasio
              </th>
              <th scope="col" data-angka="">
                Ambang
              </th>
            </tr>
          </thead>
          <tbody>
            {KONTRAS.map((b) => (
              <tr key={b.token}>
                <th scope="row">
                  <Kode>{b.token}</Kode>
                </th>
                <td>{b.tugas}</td>
                {(["terang", "gelap"] as const).map((tema) => {
                  const r = terendah(tema, b.token, b.alas);
                  return [
                    <td key={`${tema}-hex`}>
                      <span className={w.hexSel}>
                        <Contoh tema={tema} token={b.token} />
                        <span className="num">{WARNA[tema][b.token]}</span>
                      </span>
                    </td>,
                    <td key={`${tema}-r`} data-angka="">
                      {rasio(r)}
                      {r < b.ambang && (
                        <>
                          {" "}
                          <Lencana nada="merah" ikon={TriangleAlert}>
                            gagal
                          </Lencana>
                        </>
                      )}
                    </td>,
                  ];
                })}
                <td data-angka="">{b.ambang.toLocaleString(ID, { minimumFractionDigits: 1 })}</td>
              </tr>
            ))}
          </tbody>
        </Tabel>
      </Pelat>

      <Pelat
        nomor="2.3"
        judul="Peran warna"
        keterangan="Satu layar memakai paling banyak dua aksen: surya dan daun. Pri dan merah bukan aksen; keduanya punya satu tugas masing-masing."
        polos
      >
        <ul className={w.peran}>
          {PERAN.map((p) => (
            <li key={p.token} className={w.peranBaris}>
              <span className={w.pasangan} aria-hidden="true">
                <span style={{ background: `var(${p.token})` }} />
                {p.token !== "--busbar" && <span style={{ background: `var(${p.token}-bg)` }} />}
              </span>
              <span className={w.peranNama}>
                <b>{p.tugas}</b>
                <Kode>{p.token}</Kode>
              </span>
              <span className={w.peranPakai}>{p.pakai}</span>
              <span className={w.peranBukan}>
                <span className={w.bukanLabel}>Bukan untuk</span> {p.bukan}
              </span>
            </li>
          ))}
        </ul>
      </Pelat>

      <Deret kolom={2}>
        <Pelat
          nomor="2.4"
          judul="Merek, konstan di kedua tema"
          keterangan="Untuk logo, tanda air peta, dan gambar pratinjau. Di antarmuka pakai token peran di atas."
        >
          <ul className={w.merek}>
            {merek.map(([token, hex]) => (
              <li key={token}>
                <Contoh token={token} />
                <Kode>{token}</Kode>
                <span className={w.hex}>{hex}</span>
              </li>
            ))}
          </ul>
        </Pelat>
        <Pelat
          nomor="2.5"
          judul="Garis"
          keterangan="--line memisahkan isi; --line-2 membatasi kontrol dan bingkai. Tidak ada garis ketiga."
        >
          <div className={w.garis}>
            <div>
              <span className={w.garisContoh} style={{ borderColor: "var(--line)" }} />
              <Kode>--line</Kode>
              <span className={w.garisPakai}>baris data, pemisah kelompok</span>
            </div>
            <div>
              <span className={w.garisContoh} style={{ borderColor: "var(--line-2)" }} />
              <Kode>--line-2</Kode>
              <span className={w.garisPakai}>tepi tombol dan isian, bingkai</span>
            </div>
          </div>
        </Pelat>
      </Deret>

      <YaJangan
        ya={{
          contoh: (
            <div className={w.contohAksen}>
              <Label aksen="daun">Hemat per tahun</Label>
              <p className={w.angkaTinta}>Rp 12,1 juta</p>
              <Lencana nada="merah" ikon={TriangleAlert}>
                Keyakinan rendah
              </Lencana>
            </div>
          ),
          alasan: "Warna di kunci, ikon, dan latar. Hurufnya tetap tinta, sehingga kontras ≥ 4,5:1 di kedua tema.",
        }}
        jangan={{
          contoh: (
            <div className={w.contohAksen}>
              <p className={w.labelWarna}>Hemat per tahun</p>
              <p className={w.angkaTinta}>Rp 12,1 juta</p>
              <p className={w.teksMerah}>Keyakinan rendah</p>
            </div>
          ),
          alasan: "Label dan peringatan kecil dalam warna: kontrasnya di bawah tinta, dan tanpa ikon artinya hilang bagi pembaca buta warna.",
        }}
      />
    </Bagian>
  );
}
