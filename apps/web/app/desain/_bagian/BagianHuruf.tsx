import type { CSSProperties } from "react";
import { spesifikasiTipe, tracking } from "../_token";
import { toko } from "../_data";
import { Bagian, Kode, Pelat, YaJangan } from "./Lembar";
import h from "./huruf.module.css";

/* Bobot = yang dimuat next/font di app/layout.tsx; bobot lain tidak tersedia. */
const KELUARGA = [
  {
    nama: "Archivo",
    token: "--f-display",
    peran: "Angka jawaban dan judul",
    bobot: "500 · 600 · 700",
    contoh: "Rp 12,1 juta · 17,1 tahun",
  },
  {
    nama: "Instrument Sans",
    token: "--f-ui",
    peran: "Antarmuka, label, teks tubuh",
    bobot: "400 · 500 · 600",
    contoh: "Ubah asumsi · Jejak hitungan · Tarif listrik",
  },
  {
    nama: "Newsreader",
    token: "--f-prose",
    peran: "Prosa: pengantar dan metodologi",
    bobot: "400 · 500, tegak dan miring",
    contoh: "Angka contoh diberi label. Hasil buruk tetap tampil.",
  },
  {
    nama: "IBM Plex Mono",
    token: "--f-mono",
    peran: "Tabel angka, versi mesin, rujukan sumber",
    bobot: "400 · 500 · 600",
    contoh: `${toko.bangunan.source_ref} · ${toko.simulasi.engine_version.split("+")[0]}`,
  },
] as const;

const PERAN = [
  { peran: "display", contoh: "Rp 12,1 juta", pakai: "Satu angka jawaban per layar", track: "--track-display" },
  { peran: "angka", contoh: "17,1 tahun", pakai: "Angka pendamping", track: "--track-title" },
  { peran: "judul-halaman", contoh: "Hasil atap", pakai: "Judul halaman dan bagian", track: "--track-title" },
  { peran: "judul", contoh: "Rincian ekonomi", pakai: "Judul kelompok dan lembar samping", track: "--track-title" },
  { peran: "label", contoh: "Hemat per tahun", pakai: "Label angka, kepala tabel", track: "--track-label", kapital: true },
  { peran: "ui", contoh: "Ubah asumsi", pakai: "Tombol, isian, navigasi" },
  { peran: "tubuh", contoh: "Luas atap dari jejak OSM dikurangi penghalang.", pakai: "Teks antarmuka" },
  { peran: "kecil", contoh: "Citra Esri World Imagery, 14 Juli 2025", pakai: "Keterangan, metadata, sel tabel" },
  { peran: "prosa", contoh: "Setiap lapisan punya masukan, rumus, dan batas uji.", pakai: "Pengantar halaman, metodologi" },
  { peran: "data", contoh: "19.840 kWh · 80,8%", pakai: "Tabel angka, versi mesin" },
] as const;

export function BagianHuruf() {
  return (
    <Bagian
      id="huruf"
      nomor="03"
      judul="Huruf"
      aturan="Empat keluarga, masing-masing satu tugas. Hierarki dibangun dari bobot, ukuran, dan leading sekaligus; kapital hanya untuk label 12 px."
    >
      <Pelat
        nomor="3.1"
        judul="Keluarga"
        keterangan="Di-host sendiri lewat next/font, jadi tetap tampil luring. Cadangan sistem tercantum di token --f-*."
        polos
      >
        <ul className={h.keluarga}>
          {KELUARGA.map((k) => (
            <li key={k.nama} className={h.keluargaBaris}>
              <p className={h.spesimen} style={{ fontFamily: `var(${k.token})` }} data-token={k.token}>
                {k.contoh}
              </p>
              <div className={h.keluargaMeta}>
                <p className={h.keluargaNama}>{k.nama}</p>
                <p>{k.peran}</p>
                <p>
                  <Kode>{k.token}</Kode> · {k.bobot}
                </p>
              </div>
            </li>
          ))}
        </ul>
      </Pelat>

      <Pelat
        nomor="3.2"
        judul="Peran huruf"
        keterangan={
          <>
            Spesifikasi dibaca dari token <Kode>--tipe-*</Kode>. Pakai sebagai <Kode>font: var(--tipe-…)</Kode>; tracking dan
            kapital ditulis terpisah karena tidak termasuk singkatan font.
          </>
        }
        polos
      >
        <ol className={h.skala}>
          {PERAN.map((p) => {
            const spek = spesifikasiTipe(p.peran);
            const track = "track" in p ? tracking(p.track) : null;
            const gaya: CSSProperties = {
              font: `var(--tipe-${p.peran})`,
              letterSpacing: "track" in p ? `var(${p.track})` : undefined,
              textTransform: "kapital" in p ? "uppercase" : undefined,
            };
            return (
              <li key={p.peran} className={h.skalaBaris}>
                <p className={h.skalaToken}>
                  <Kode>--tipe-{p.peran}</Kode>
                </p>
                <p className={h.skalaContoh} style={gaya}>
                  {p.contoh}
                </p>
                <p className={h.skalaSpek}>
                  {spek && (
                    <span className="num">
                      {spek.keluarga} {spek.berat} · {spek.ukuran} / {spek.leading}
                      {track && ` · ${track}`}
                      {"kapital" in p && " · kapital"}
                    </span>
                  )}
                  <span>{p.pakai}</span>
                </p>
              </li>
            );
          })}
        </ol>
      </Pelat>

      <YaJangan
        ya={{
          contoh: (
            <div className={h.contohJudul}>
              <p className={h.contohLabel}>Hasil atap</p>
              <p className={h.contohH}>Balik modal dalam 17,1 tahun</p>
              <p className={h.contohTubuh}>Hemat Rp 12,1 juta per tahun dari 14,3 kWp di atap pelana.</p>
            </div>
          ),
          alasan: "Judul kalimat biasa, rata kiri, langsung menyebut angka. Kapital hanya di label.",
        }}
        jangan={{
          contoh: (
            <div className={h.contohBrosur}>
              <p className={h.brosurJudul}>Energi matahari untuk semua</p>
              <p className={h.brosurTubuh}>Wujudkan rumah hemat energi bersama kami hari ini juga.</p>
            </div>
          ),
          alasan: "Judul kapital berjarak lebar dan teks rata tengah adalah bahasa brosur. Tidak ada angka yang bisa diperiksa.",
        }}
      />
    </Bagian>
  );
}
