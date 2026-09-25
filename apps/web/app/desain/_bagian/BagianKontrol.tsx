import Link from "next/link";
import type { ReactNode } from "react";
import { Download, RotateCw, SlidersHorizontal, TriangleAlert, X } from "lucide-react";
import { Kolom, Lencana, Segmen, Tombol, kelasTautan, persen } from "@petasurya/ui";
import { toko } from "../_data";
import { Bagian, Deret, Kode, Pelat, Ukur, YaJangan } from "./Lembar";
import k from "./kontrol.module.css";

const ID = "id-ID";
const asumsi = toko.simulasi.asumsi;
const ribuan = (n: number, desimal = 0) => n.toLocaleString(ID, { maximumFractionDigits: desimal });
/** Panjang dalam px tombol asli → px gambar; --skala diatur CSS menurut lebar pelat. */
const skala = (px: number) => `calc(${px}px * var(--skala))`;

type Paksa = "hover" | "aktif" | "fokus";
const KEADAAN: { nama: string; catatan: ReactNode; paksa?: Paksa; mati?: boolean; sibuk?: boolean }[] = [
  { nama: "Biasa", catatan: "Isian dan garis tepi dasar" },
  { nama: "Disorot", catatan: "Hanya perangkat berpenunjuk", paksa: "hover" },
  { nama: "Ditekan", catatan: "Saat pointer-down, skala 0,98", paksa: "aktif" },
  {
    nama: "Fokus",
    catatan: (
      <>
        Papan ketik, cincin 2&nbsp;px <Kode>--pri</Kode>
      </>
    ),
    paksa: "fokus",
  },
  {
    nama: "Mati",
    catatan: (
      <>
        <Kode>--ink-3</Kode> di atas <Kode>--surface-2</Kode>
      </>
    ),
    mati: true,
  },
  { nama: "Sibuk", catatan: "Label tetap, ikon jadi indikator", sibuk: true },
];

export function BagianKontrol() {
  return (
    <Bagian
      id="kontrol"
      nomor="08"
      judul="Kontrol"
      aturan="Dua gaya tombol, satu tinggi kontrol. Satu tombol primer per layar, untuk aksi yang menjawab pertanyaan pengguna."
    >
      {/* Matriks = tabel: di layar sempit bergulir di bingkainya. Inert dipasang di
          isi, bukan di panggung, agar panggung tetap bisa digulir. */}
      <Pelat
        nomor="8.1"
        judul="Tombol, enam keadaan"
        keterangan="Label wajib di semua tombol. Pada tombol ikon, label disembunyikan secara visual dan tetap dibaca pembaca layar."
        gulir
      >
        <div className={k.matriks} inert>
          <div className={k.kepalaMatriks}>
            <span />
            <span>Primer</span>
            <span>Sekunder</span>
            <span>Ikon</span>
          </div>
          {KEADAAN.map((s) => (
            <div key={s.nama} className={k.barisMatriks}>
              <p className={k.keadaan}>
                <span className={k.keadaanNama}>{s.nama}</span>
                <span className={k.keadaanCatatan}>{s.catatan}</span>
              </p>
              <Tombol varian="primer" ikon={RotateCw} paksa={s.paksa} disabled={s.mati} sibuk={s.sibuk}>
                Hitung ulang
              </Tombol>
              <Tombol ikon={SlidersHorizontal} paksa={s.paksa} disabled={s.mati} sibuk={s.sibuk}>
                Ubah asumsi
              </Tombol>
              <Tombol ikon={X} hanyaIkon paksa={s.paksa} disabled={s.mati} sibuk={s.sibuk}>
                Tutup
              </Tombol>
            </div>
          ))}
        </div>
      </Pelat>

      <Deret kolom={2}>
        <Pelat
          nomor="8.2"
          judul="Anatomi tombol"
          keterangan="Tinggi --kontrol-h: 36, atau 44 di layar sentuh. Tepi 1, padding 16, ikon 16, ikon ke label 8, radius 4. Label 15&nbsp;px, tebal 600."
          kisi
          statis
        >
          <div className={k.anatomi}>
            <span className={k.skalaGambar} aria-hidden="true">
              Skala <span className={k.skalaBesar}>2:1</span>
              <span className={k.skalaKecil}>1,5:1</span>
            </span>
            <div className={k.tombolUkur}>
              <div className={k.besar}>
                <Tombol varian="primer" ikon={RotateCw}>
                  Hitung ulang
                </Tombol>
              </div>
              {/* Ukuran asli dikali --skala: tepi 1 + padding 16 | ikon 16 | jarak 8 | … | padding 16 + tepi 1. */}
              <Ukur arah="h" label="16" luar="atas" gaya={{ left: skala(1), width: skala(16), top: -16 }} />
              <Ukur arah="h" label="16" luar="atas" gaya={{ left: skala(17), width: skala(16), top: -16 }} />
              <Ukur arah="h" label="8" luar="atas" gaya={{ left: skala(33), width: skala(8), top: -16 }} />
              <Ukur arah="h" label="16" luar="atas" gaya={{ right: skala(1), width: skala(16), top: -16 }} />
              <span className={k.tinggiHalus}>
                <Ukur arah="v" label="36" luar="kiri" gaya={{ left: -16, top: 0, height: "100%" }} />
              </span>
              <span className={k.tinggiSentuh}>
                <Ukur arah="v" label="44" luar="kiri" gaya={{ left: -16, top: 0, height: "100%" }} />
              </span>
            </div>
          </div>
        </Pelat>

        <Pelat
          nomor="8.3"
          judul="Tautan dan lencana"
          keterangan="Warna aksi ada di garis bawah tautan, bukan di hurufnya. Lencana: teks --ink, warna hanya di ikon dan latar."
        >
          <div className={k.tautanLencana}>
            <p className={k.kalimat}>
              Angka ini memakai asumsi di{" "}
              <Link href="/metodologi" className={kelasTautan()}>
                metodologi
              </Link>{" "}
              dan tarif dari{" "}
              <Link href="/sumber-data" className={kelasTautan()}>
                sumber data
              </Link>
              .
            </p>
            <ul className={k.lencanaDaftar}>
              <li>
                <Lencana>Jejak OSM</Lencana>
                <span>Netral: asal data</span>
              </li>
              <li>
                <Lencana nada="pri" ikon={SlidersHorizontal}>
                  Asumsi diubah
                </Lencana>
                <span>Pri: keadaan yang dibuat pengguna</span>
              </li>
              <li>
                <Lencana nada="merah" ikon={TriangleAlert}>
                  Keyakinan rendah
                </Lencana>
                <span>Merah: peringatan, selalu dengan ikon</span>
              </li>
              <li>
                <Lencana contoh>Contoh</Lencana>
                <span>Garis putus: data contoh, bukan hasil hitungan</span>
              </li>
            </ul>
          </div>
        </Pelat>
      </Deret>

      <Deret kolom={2}>
        <Pelat
          nomor="8.4"
          judul="Kolom isian, empat keadaan"
          keterangan="Satuan di dalam kotak, nilai dalam satuan yang dipahami orang. Galat menggantikan petunjuk di tempat yang sama."
          statis
        >
          <div className={k.kolomKisi}>
            <Kolom
              label="Tarif listrik"
              satuan="Rp/kWh"
              defaultValue={ribuan(asumsi.tarif_rp_kwh, 1)}
              petunjuk={`${asumsi.golongan_tarif} · ${ribuan(asumsi.daya_va)} VA`}
            />
            <Kolom
              label="Konsumsi sendiri"
              satuan="%"
              defaultValue={ribuan(asumsi.scr * 100)}
              petunjuk="Bagian produksi yang dipakai sendiri"
              paksa="fokus"
            />
            <Kolom
              label="Biaya per kWp"
              satuan="Rp/kWp"
              defaultValue="14,5jt"
              galat={`Isi dengan angka saja, mis. ${ribuan(asumsi.biaya_per_kwp)}.`}
            />
            <Kolom
              label="Daya tersambung"
              satuan="VA"
              defaultValue={ribuan(asumsi.daya_va)}
              petunjuk="Terkunci selama hitung ulang"
              disabled
            />
          </div>
        </Pelat>

        <Pelat
          nomor="8.5"
          judul="Segmen"
          keterangan="Pilihan tunggal 2–4 opsi dari radio asli: panah kiri dan kanan berpindah opsi tanpa skrip. Coba dengan papan ketik."
        >
          <div className={k.segmenDaftar}>
            <Segmen
              label="Peta dasar"
              nama="desain-peta-dasar"
              pilihan={[
                { nilai: "peta", label: "Peta" },
                { nilai: "citra", label: "Citra satelit" },
              ]}
              bawaan="peta"
            />
            <Segmen
              label="Golongan tarif"
              nama="desain-golongan"
              pilihan={[
                { nilai: "R-1/TR", label: "R-1/TR" },
                { nilai: "B-1/TR", label: "B-1/TR" },
              ]}
              bawaan={asumsi.golongan_tarif as "R-1/TR"}
            />
            <Segmen
              label="Tampilan"
              nama="desain-tampilan"
              pilihan={[
                { nilai: "grafik", label: "Grafik" },
                { nilai: "tabel", label: "Tabel" },
              ]}
              bawaan="grafik"
            />
          </div>
        </Pelat>
      </Deret>

      <YaJangan
        ya={{
          contoh: (
            <div className={k.deretTombol}>
              <Tombol varian="primer" ikon={RotateCw}>
                Hitung ulang
              </Tombol>
              <Tombol ikon={SlidersHorizontal}>Ubah asumsi</Tombol>
            </div>
          ),
          alasan: "Satu primer: aksi utama terlihat tanpa dicari. Aksi lain sekunder.",
        }}
        jangan={{
          contoh: (
            <div className={k.deretTombol}>
              <Tombol varian="primer" ikon={RotateCw}>
                Hitung ulang
              </Tombol>
              <Tombol varian="primer" ikon={SlidersHorizontal}>
                Ubah asumsi
              </Tombol>
              <Tombol varian="primer" ikon={Download}>
                Unduh
              </Tombol>
            </div>
          ),
          alasan: "Tiga primer bersaing; tidak ada yang utama.",
        }}
      />
      <YaJangan
        ya={{
          contoh: (
            <div className={k.lebarKolom}>
              <Kolom
                label="Konsumsi sendiri"
                satuan="%"
                defaultValue={ribuan(asumsi.scr * 100)}
                petunjuk="Bagian produksi yang dipakai sendiri"
              />
            </div>
          ),
          alasan: `Satuan yang dipahami orang: ${persen(asumsi.scr)}, dengan penjelasan istilahnya.`,
        }}
        jangan={{
          contoh: (
            <label className={k.kolomMentah}>
              <span>SCR</span>
              <input defaultValue={String(asumsi.scr)} className={k.masukanMentah} />
            </label>
          ),
          alasan: (
            <>
              Notasi mesin: nama kolom kontrak (<Kode>scr</Kode>), pecahan 0–1, dan titik desimal Inggris.
            </>
          ),
        }}
      />
    </Bagian>
  );
}
