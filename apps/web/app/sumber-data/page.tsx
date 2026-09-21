import fs from "node:fs";
import path from "node:path";
import { parse } from "yaml";
import s from "./sumberData.module.css";

export const metadata = { title: "Sumber data" };

type Sumber = {
  id: string;
  nama: string;
  penerbit: string;
  url: string;
  tahun: number;
  diambil: string;
  dipakai_untuk: string;
  status: "terverifikasi" | "belum diverifikasi" | string;
};

function bacaSumber(): Sumber[] {
  const berkas = path.resolve(process.cwd(), "../../data/sources/sumber.yaml");
  const dokumen = parse(fs.readFileSync(berkas, "utf8")) as { sumber?: Sumber[] };
  return dokumen.sumber ?? [];
}

export default function SumberData() {
  const sumber = bacaSumber();
  return (
    <main className={s.halaman}>
      <header className={s.kepala}>
        <p className={s.label}>SUMBER DATA</p>
        <h1 className={s.judul}>Data yang bisa ditelusuri.</h1>
        <p className={s.pengantar}>Tabel ini dibaca langsung dari registri sumber proyek. Status dan tanggal terlihat bersama pemakaiannya.</p>
      </header>

      <section className={s.ringkasan} aria-label="Ringkasan sumber">
        <strong className="num">{sumber.length}</strong>
        <span>entri sumber terdaftar</span>
        <span className={s.catatan}>Angka belum diverifikasi tidak dipakai sebagai klaim resmi.</span>
      </section>

      <div className={s.tabelWrap}>
        <table className={s.tabel}>
          <caption className={s.srOnly}>Registri sumber data PetaSurya</caption>
          <thead>
            <tr>
              <th scope="col">Sumber</th>
              <th scope="col">Penerbit</th>
              <th scope="col">Tahun</th>
              <th scope="col">Diambil</th>
              <th scope="col">Dipakai untuk</th>
              <th scope="col">Status</th>
            </tr>
          </thead>
          <tbody>
            {sumber.map((item) => (
              <tr key={item.id}>
                <th scope="row">
                  <a href={item.url} target="_blank" rel="noreferrer">{item.nama}</a>
                  <span className={s.idSumber}>{item.id}</span>
                </th>
                <td>{item.penerbit}</td>
                <td className="num">{item.tahun}</td>
                <td className="num">{item.diambil}</td>
                <td>{item.dipakai_untuk}</td>
                <td><span className={item.status === "terverifikasi" ? s.statusBaik : s.statusBelum}>{item.status}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className={s.catatanBawah}>Nilai kosong sengaja tidak diisi. Tambahkan sumber resmi dan tanggal verifikasi sebelum angka masuk mesin.</p>
    </main>
  );
}
