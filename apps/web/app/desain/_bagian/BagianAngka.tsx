import {
  Angka,
  DaftarData,
  JejakTautan,
  Tabel,
  kwh,
  kwp,
  m2,
  persen,
  rupiah,
  tahun,
  ton,
  ucapan,
} from "@petasurya/ui";
import { kampus, limun, toko } from "../_data";
import { Bagian, Kode, Pelat, Penanda, YaJangan } from "./Lembar";
import { DemoHitungUlang } from "./DemoHitungUlang";
import a from "./angkaDesain.module.css";

const ID = "id-ID";
const sim = toko.simulasi;
const asumsi = sim.asumsi;

const tarif = `${asumsi.tarif_rp_kwh.toLocaleString(ID, { maximumFractionDigits: 1 })} Rp/kWh`;
const keteranganHemat = `Tahun pertama · ${asumsi.golongan_tarif} ${tarif} · konsumsi sendiri ${persen(asumsi.scr)}`;

const ANATOMI = [
  { nama: "Label dan kunci", isi: "12 px, 600, kapital, --ink-2. Kunci 8 px membawa kategori: surya energi, daun uang dan CO₂." },
  { nama: "Awalan", isi: "Satuan di depan angka. 0,4 em pada display, 0,55 em pada figure; 500, --ink-2." },
  { nama: "Angka", isi: "Archivo 600, --ink. Presisi penuh muncul saat disorot." },
  { nama: "Akhiran", isi: "juta, kWp, tahun: aturan sama dengan awalan." },
  { nama: "Keterangan", isi: "13 px --ink-2. Asumsi yang paling menggeser angka ini." },
  { nama: "Jejak", isi: "Membuka lembar jejak: rumus, masukan, sumber." },
] as const;

/* Masukan = nilai fixture apa adanya; keluaran dihitung saat render. */
const FORMAT = [
  { panggil: `rupiah(${sim.savings_idr_yr1}, true)`, keluar: rupiah(sim.savings_idr_yr1, true) },
  { panggil: `rupiah(${sim.savings_idr_yr1})`, keluar: rupiah(sim.savings_idr_yr1) },
  { panggil: `rupiah(${sim.npv_idr}, true)`, keluar: rupiah(sim.npv_idr, true) },
  { panggil: `kwp(${sim.kwp})`, keluar: kwp(sim.kwp) },
  { panggil: `kwh(${sim.e_ac_kwh_yr1})`, keluar: kwh(sim.e_ac_kwh_yr1) },
  { panggil: `ton(${sim.co2e_ton_yr})`, keluar: ton(sim.co2e_ton_yr) },
  { panggil: `m2(${toko.analisis.usable_area_m2})`, keluar: m2(toko.analisis.usable_area_m2) },
  { panggil: `persen(${sim.pr})`, keluar: persen(sim.pr) },
  { panggil: `tahun(${sim.payback_years})`, keluar: tahun(sim.payback_years ?? Infinity) },
  { panggil: `tahun(${limun.simulasi.payback_years})`, keluar: tahun(limun.simulasi.payback_years ?? Infinity) },
  { panggil: "tahun(Infinity)", keluar: tahun(Infinity), catatan: "payback_years = null" },
];

const ribuan = (n: number) => n.toLocaleString(ID, { maximumFractionDigits: 0 });

/* Tiga bangunan fixture, hemat tahun pertama. */
const HEMAT = [
  { nama: toko.bangunan.nama ?? toko.bangunan.source_ref, rp: toko.simulasi.savings_idr_yr1, ringkas: "Rp 12,1 juta" },
  { nama: "Rumah, Kandang Limun", rp: limun.simulasi.savings_idr_yr1, ringkas: "Rp39.555.354" },
  { nama: "Fakultas Hukum UNIB", rp: kampus.simulasi.savings_idr_yr1, ringkas: "348,5 jt" },
];

export function BagianAngka() {
  const hemat = rupiah(sim.savings_idr_yr1, true);
  const hematLengkap = rupiah(sim.savings_idr_yr1);

  return (
    <Bagian
      id="angka"
      nomor="04"
      judul="Angka"
      aturan="Angka adalah produknya. Selalu bersatuan, dibulatkan sejujur datanya, dan bisa ditelusuri sampai rumus dan sumbernya."
    >
      <Pelat
        nomor="4.1"
        judul="Anatomi angka jawaban"
        keterangan="Komponen Angka ukuran display dengan data toko contoh. Jarak antarbagian direnggangkan agar penanda muat; di layar jaraknya 12 px."
        kisi
        statis
      >
        <div className={a.anatomi}>
          <div className={a.anatomiAngka}>
            <Angka
              ukuran="display"
              label="Hemat per tahun"
              aksen="daun"
              nilai={hemat}
              lengkap={hematLengkap}
              keterangan={keteranganHemat}
              jejak={<JejakTautan />}
            />
          </div>
          <ol className={a.legenda}>
            {ANATOMI.map((b, i) => (
              <li key={b.nama}>
                <Penanda>{i + 1}</Penanda>
                <span>
                  <b>{b.nama}</b> {b.isi}
                </span>
              </li>
            ))}
          </ol>
        </div>
      </Pelat>

      <Pelat
        nomor="4.2"
        judul="Fungsi format"
        keterangan={
          <>
            Semua angka di layar lewat <Kode>packages/ui/src/format.ts</Kode> dengan locale id-ID eksplisit. Kolom terakhir
            adalah teks yang dibaca pembaca layar (<Kode>ucapan()</Kode>).
          </>
        }
        polos
      >
        <Tabel judul="Keluaran format, dihitung dari fixture" gulir>
          <thead>
            <tr>
              <th scope="col">Panggilan</th>
              <th scope="col">Tampil</th>
              <th scope="col">Dibaca</th>
            </tr>
          </thead>
          <tbody>
            {FORMAT.map((f) => (
              <tr key={f.panggil}>
                <th scope="row" className={a.panggil}>
                  <Kode>{f.panggil}</Kode>
                  {f.catatan && <span className={a.catatanPanggil}>{f.catatan}</span>}
                </th>
                <td className={a.tampil}>{f.keluar}</td>
                <td>{ucapan(f.keluar)}</td>
              </tr>
            ))}
          </tbody>
        </Tabel>
      </Pelat>

      <Pelat
        nomor="4.3"
        judul="Hitung ulang"
        keterangan="Angka lama tetap di tempat dan meredup ke 40 %. Tata letak tidak bergeser, tidak ada pemintal di atas data yang sudah ada."
      >
        <DemoHitungUlang
          hemat={hemat}
          hematLengkap={hematLengkap}
          payback={sim.payback_years}
          rincian={[
            { label: "Kapasitas", nilai: kwp(sim.kwp) },
            { label: "Produksi tahun pertama", nilai: kwh(sim.e_ac_kwh_yr1) },
            { label: "Emisi terhindar", nilai: `${ton(sim.co2e_ton_yr)}/tahun` },
          ]}
        />
      </Pelat>

      <YaJangan
        ya={{
          contoh: (
            <Tabel judul="Hemat tahun pertama">
              <thead>
                <tr>
                  <th scope="col">Bangunan</th>
                  <th scope="col" data-angka="">
                    Rp/tahun
                  </th>
                </tr>
              </thead>
              <tbody>
                {HEMAT.map((b) => (
                  <tr key={b.nama}>
                    <th scope="row">{b.nama}</th>
                    <td data-angka="">{ribuan(b.rp)}</td>
                  </tr>
                ))}
              </tbody>
            </Tabel>
          ),
          alasan: "Kolom angka rata kanan, mono tabular, satuan di kepala kolom. Besaran terbaca dari panjang angkanya.",
        }}
        jangan={{
          contoh: (
            <ul className={a.kolomCampur}>
              {HEMAT.map((b) => (
                <li key={b.nama}>
                  <span>{b.nama}</span>
                  <span>{b.ringkas}</span>
                </li>
              ))}
            </ul>
          ),
          alasan: "Rata kiri dengan tiga format berbeda dalam satu kolom: besaran tidak bisa dibandingkan sekilas.",
        }}
      />
      <YaJangan
        ya={{
          contoh: <Angka label="Hemat per tahun" aksen="daun" nilai={hemat} keterangan="Tahun pertama" />,
          alasan: "Label, satuan lebih kecil dari angkanya, pemisah ribuan id-ID. Presisi penuh saat disorot.",
        }}
        jangan={{
          contoh: <p className={a.mentah}>{sim.savings_idr_yr1}</p>,
          alasan: "Angka telanjang: tanpa label, tanpa satuan, tanpa pemisah ribuan, diwarnai untuk menggantikan makna.",
        }}
      />
      <YaJangan
        ya={{
          contoh: (
            <DaftarData
              baris={[
                { label: "Balik modal, rumah Kandang Limun", nilai: tahun(limun.simulasi.payback_years ?? Infinity) },
                { label: "Balik modal, bila modal tidak kembali", nilai: tahun(Infinity) },
              ]}
            />
          ),
          alasan: "Satu desimal untuk tahun. Di atas umur sistem, kata menggantikan angka.",
        }}
        jangan={{
          contoh: (
            <DaftarData
              baris={[
                { label: "Balik modal, rumah Kandang Limun", nilai: `${limun.simulasi.payback_years} tahun` },
                { label: "Balik modal, bila modal tidak kembali", nilai: "NaN tahun" },
              ]}
            />
          ),
          alasan: "Presisi palsu dari keluaran mesin, dan nilai kosong bocor sebagai NaN.",
        }}
      />
    </Bagian>
  );
}
