import { Angka, DaftarData, Panel, Tabel, kwh, kwp, rupiah } from "@petasurya/ui";
import { toko } from "../_data";
import { tokenAkar, tokenMedia, ukuranPx } from "../_token";
import { Bagian, Deret, Kode, Pelat, Ukur, YaJangan } from "./Lembar";
import r from "./ruang.module.css";

/* Tugas tiap langkah = pemakaian yang ditetapkan lembar ini untuk semua layar. */
const SPASI = [
  { token: "--sp-1", pakai: "Ikon ke teks di lencana dan tautan jejak" },
  { token: "--sp-2", pakai: "Ikon ke label tombol, label ke angka, isi baris data" },
  { token: "--sp-3", pakai: "Isi kolom isian dan sel tabel, jarak antartombol" },
  { token: "--sp-4", pakai: "Padding panel dan tombol, tepi halaman di ponsel" },
  { token: "--sp-5", pakai: "Indentasi daftar bernomor" },
  { token: "--sp-6", pakai: "Antarkelompok di dalam panel" },
  { token: "--sp-8", pakai: "Antarpanel dan antarpelat, tepi halaman di desktop" },
  { token: "--sp-10", pakai: "Padding atas halaman, antarkolom tata letak" },
  { token: "--sp-12", pakai: "Padding bawah halaman" },
  { token: "--sp-16", pakai: "Antarbagian halaman dokumen" },
] as const;

const TATA = [
  { token: "--lebar-isi", pakai: "Lebar maksimum halaman dokumen" },
  { token: "--lebar-teks", pakai: "Lebar prosa, ±70 karakter per baris" },
  { token: "--tepi", pakai: "Margin kiri-kanan halaman, cair mengikuti lebar layar" },
  { token: "--header-h", pakai: "Tinggi header; batas atas lembar samping" },
  { token: "--kontrol-h", pakai: "Tinggi tombol, kolom isian, dan segmen" },
  { token: "--lebar-lembar", pakai: "Lembar samping dan panel jawaban di samping peta" },
] as const;

const sim = toko.simulasi;

export function BagianRuang() {
  const akar = tokenAkar();
  const kontrolSentuh = tokenMedia("(pointer: coarse)", "--kontrol-h");

  return (
    <Bagian
      id="ruang"
      nomor="05"
      judul="Ruang"
      aturan="Kelipatan 4 px. Rapat seperti alat ukur: padding 12–16 px, dan setiap ruang kosong punya tugas."
    >
      <Pelat nomor="5.1" judul="Skala spasi" keterangan="Batang digambar pada ukuran sebenarnya." polos>
        <ol className={r.skala}>
          {SPASI.map((b) => (
            <li key={b.token} className={r.skalaBaris}>
              <Kode>{b.token}</Kode>
              <span className={`${r.px} num`}>{ukuranPx(akar[b.token])}</span>
              <span className={r.batangWadah} aria-hidden="true">
                <span className={r.batang} style={{ width: `var(${b.token})` }} />
              </span>
              <span className={r.pakai}>{b.pakai}</span>
            </li>
          ))}
        </ol>
      </Pelat>

      <Deret kolom={2}>
        <Pelat
          nomor="5.2"
          judul="Kepadatan panel"
          keterangan="Padding 16 di keempat sisi dan di semua lebar layar. Kelompok dipisah 24 dan garis --line, bukan panel di dalam panel."
          kisi
          statis
        >
          <Panel as="div" className={r.panelUkur}>
            <Angka label="Kapasitas" aksen="surya" nilai={kwp(sim.kwp)} keterangan={`${sim.module_count} modul`} />
            <span className={r.celah} aria-hidden="true">
              <Ukur
                arah="h"
                label="16"
                luar="kanan"
                gaya={{ left: "calc(-1 * var(--sp-4))", width: "var(--sp-4)", top: "calc(50% - 4px)" }}
              />
              <Ukur arah="v" label="24" luar="kanan" gaya={{ top: 0, bottom: 0, left: "62%" }} />
            </span>
            <DaftarData
              baris={[
                { label: "Produksi tahun pertama", nilai: kwh(sim.e_ac_kwh_yr1) },
                { label: "Biaya pasang", nilai: rupiah(sim.capex_idr, true) },
              ]}
            />
            <Ukur arah="v" label="16" luar="kanan" gaya={{ top: 0, height: "var(--sp-4)", left: "62%" }} />
          </Panel>
        </Pelat>

        <Pelat
          nomor="5.3"
          judul="Token tata letak"
          keterangan={
            <>
              Tinggi kontrol naik ke {ukuranPx(kontrolSentuh ?? "")} di layar sentuh (<Kode>pointer: coarse</Kode>).
            </>
          }
          polos
        >
          <Tabel judul="Tata letak">
            <thead>
              <tr>
                <th scope="col">Token</th>
                <th scope="col" data-angka="">
                  Nilai
                </th>
                <th scope="col">Tugas</th>
              </tr>
            </thead>
            <tbody>
              {TATA.map((t) => (
                <tr key={t.token}>
                  <th scope="row" className={r.token}>
                    <Kode>{t.token}</Kode>
                  </th>
                  <td data-angka="">{ukuranPx(akar[t.token])}</td>
                  <td>{t.pakai}</td>
                </tr>
              ))}
            </tbody>
          </Tabel>
        </Pelat>
      </Deret>

      <YaJangan
        ya={{
          contoh: (
            <Panel as="div">
              <Angka
                label="Kapasitas"
                aksen="surya"
                nilai={kwp(sim.kwp)}
                keterangan={`${sim.module_count} modul · ${kwh(sim.e_ac_kwh_yr1)} tahun pertama`}
              />
            </Panel>
          ),
          alasan: "Padding 16, rata kiri. Label, angka, dan rinciannya terbaca dalam satu pandangan.",
        }}
        jangan={{
          contoh: (
            <div className={r.kartuLapang}>
              <p className={r.kartuAngka}>{kwp(sim.kwp)}</p>
              <p className={r.kartuLabel}>Kapasitas</p>
            </div>
          ),
          alasan:
            "Padding 48, rata tengah, dan bayangan membuat ruang tanpa tugas. Rinciannya terdorong keluar; yang tersisa satu angka.",
        }}
      />
    </Bagian>
  );
}
