import {
  ChartColumn,
  Check,
  ChevronDown,
  ChevronRight,
  CloudOff,
  Crosshair,
  ExternalLink,
  Layers,
  MapPin,
  Menu,
  Moon,
  Pause,
  Play,
  RotateCw,
  Satellite,
  Scan,
  Search,
  Sigma,
  SlidersHorizontal,
  Sun,
  Table2,
  TriangleAlert,
  WifiOff,
  X,
  type LucideIcon,
} from "lucide-react";
import { Ikon, Tabel, persen } from "@petasurya/ui";
import { tokenAkar } from "../_token";
import { Bagian, DaftarAturan, Kode, Pelat } from "./Lembar";
import { DemoGerak } from "./DemoGerak";
import g from "./ikonGerak.module.css";

/* Satu arti, satu ikon. Urutan: peta, hitung, tampilan data, keadaan, kontrol. */
const IKON: { ikon: LucideIcon; nama: string; arti: string }[] = [
  { ikon: Search, nama: "Search", arti: "Cari alamat atau bangunan" },
  { ikon: Crosshair, nama: "Crosshair", arti: "Pusatkan peta ke bangunan" },
  { ikon: Satellite, nama: "Satellite", arti: "Citra satelit sebagai peta dasar" },
  { ikon: Layers, nama: "Layers", arti: "Lapisan peta" },
  { ikon: MapPin, nama: "MapPin", arti: "Belum ada bangunan dipilih" },
  { ikon: Scan, nama: "Scan", arti: "Pindai atap dari citra" },
  { ikon: Sigma, nama: "Sigma", arti: "Jejak hitungan: rumus dan sumber" },
  { ikon: SlidersHorizontal, nama: "SlidersHorizontal", arti: "Ubah asumsi" },
  { ikon: RotateCw, nama: "RotateCw", arti: "Hitung ulang, ulangi pemindaian" },
  { ikon: ChartColumn, nama: "ChartColumn", arti: "Tampilkan sebagai grafik" },
  { ikon: Table2, nama: "Table2", arti: "Tampilkan sebagai tabel" },
  { ikon: TriangleAlert, nama: "TriangleAlert", arti: "Peringatan, keyakinan rendah" },
  { ikon: CloudOff, nama: "CloudOff", arti: "Mesin hitung tidak menjawab" },
  { ikon: WifiOff, nama: "WifiOff", arti: "Perangkat luring" },
  { ikon: Check, nama: "Check", arti: "Sesuai, tahap selesai" },
  { ikon: X, nama: "X", arti: "Tutup lembar atau dialog" },
  { ikon: ChevronDown, nama: "ChevronDown", arti: "Buka rincian di tempat" },
  { ikon: ChevronRight, nama: "ChevronRight", arti: "Buka hasil dari baris bangunan" },
  { ikon: Menu, nama: "Menu", arti: "Buka navigasi di ponsel" },
  { ikon: Play, nama: "Play", arti: "Putar pemindaian" },
  { ikon: Pause, nama: "Pause", arti: "Jeda pemindaian" },
  { ikon: ExternalLink, nama: "ExternalLink", arti: "Buka sumber luar di tab baru" },
  { ikon: Sun, nama: "Sun", arti: "Ganti ke tema terang" },
  { ikon: Moon, nama: "Moon", arti: "Ganti ke tema gelap" },
];

const DURASI = [
  { token: "--t-fast", tugas: "Umpan balik tekan: warna dan skala 0,98" },
  { token: "--t-base", tugas: "Opacity dan warna: redup saat hitung ulang, pudar lembar" },
  { token: "--t-move", tugas: "Perpindahan: lembar samping masuk dan keluar" },
] as const;

const GERAK = [
  { gerak: "Tombol ditekan: warna, skala 0,98", durasi: "100 ms", minimal: "Warna tetap, skala mati" },
  { gerak: "Hitung ulang: angka meredup ke 40 %", durasi: "180 ms", minimal: "Tetap, hanya opacity" },
  { gerak: "Lembar samping masuk dan keluar", durasi: "260 ms geser, 180 ms pudar", minimal: "Geser mati, pudar tetap" },
  { gerak: "Peta terbang ke bangunan", durasi: "500 ms, kurva MapLibre", minimal: "Langsung lompat" },
  { gerak: "Indikator sibuk di tombol", durasi: "800 ms per putaran", minimal: "Berdenyut opacity" },
] as const;

/** cubic-bezier(x1, y1, x2, y2) dari token --ease-out. */
function titikKurva(token: string): [number, number, number, number] {
  const n = /cubic-bezier\(([^)]+)\)/.exec(token)?.[1].split(",").map(Number);
  if (!n || n.length !== 4 || n.some((v) => !Number.isFinite(v))) throw new Error(`--ease-out bukan cubic-bezier: ${token}`);
  return [n[0], n[1], n[2], n[3]];
}

/** Kurva digambar dari token; penanda = waktu saat 90 % jarak ditempuh. */
function KurvaEase({ p }: { p: [number, number, number, number] }) {
  const [x1, y1, x2, y2] = p;
  const S = 168;
  const m = 28;
  const X = (t: number) => m + t * S;
  const Y = (v: number) => m + (1 - v) * S;
  const bezier = (t: number) => {
    const u = 1 - t;
    return [3 * u * u * t * x1 + 3 * u * t * t * x2 + t ** 3, 3 * u * u * t * y1 + 3 * u * t * t * y2 + t ** 3];
  };
  let bawah = 0;
  let atas = 1;
  for (let i = 0; i < 40; i++) {
    const tengah = (bawah + atas) / 2;
    if (bezier(tengah)[1] < 0.9) bawah = tengah;
    else atas = tengah;
  }
  const w = bezier((bawah + atas) / 2)[0];
  const lebar = S + 2 * m;

  return (
    <svg className={g.kurva} viewBox={`0 0 ${lebar} ${lebar}`} width={lebar} height={lebar} aria-hidden="true">
      <path className={g.sumbu} d={`M ${X(0)} ${Y(1)} V ${Y(0)} H ${X(1)}`} />
      <path className={g.linear} d={`M ${X(0)} ${Y(0)} L ${X(1)} ${Y(1)}`} />
      <path className={g.bantu} d={`M ${X(0)} ${Y(0.9)} H ${X(w)} V ${Y(0)}`} />
      <path className={g.pegangan} d={`M ${X(0)} ${Y(0)} L ${X(x1)} ${Y(y1)} M ${X(1)} ${Y(1)} L ${X(x2)} ${Y(y2)}`} />
      <path
        className={g.garisKurva}
        d={`M ${X(0)} ${Y(0)} C ${X(x1)} ${Y(y1)}, ${X(x2)} ${Y(y2)}, ${X(1)} ${Y(1)}`}
      />
      <circle className={g.titikKendali} cx={X(x1)} cy={Y(y1)} r={3} />
      <circle className={g.titikKendali} cx={X(x2)} cy={Y(y2)} r={3} />
      <text className={g.labelSumbu} x={X(0) - 6} y={Y(0.9) + 4} textAnchor="end">
        90%
      </text>
      <text className={g.labelSumbu} x={X(w)} y={Y(0) + 16} textAnchor="middle">
        {persen(Math.round(w * 100) / 100)}
      </text>
      <text className={g.labelSumbu} x={X(1)} y={Y(0) + 16} textAnchor="end">
        waktu
      </text>
      <text className={g.labelSumbu} x={X(0)} y={Y(1) - 16}>
        kemajuan
      </text>
    </svg>
  );
}

export function BagianIkonGerak() {
  const akar = tokenAkar();
  const kurva = titikKurva(akar["--ease-out"]);
  const separuh = Math.ceil(IKON.length / 2);

  return (
    <Bagian
      id="ikon-gerak"
      nomor="07"
      judul="Ikon & gerak"
      aturan="Ikon menamai tindakan, bukan menghias. Gerak hanya menjawab sentuhan, menandai perubahan keadaan, dan memindahkan peta."
    >
      <Pelat
        nomor="7.1"
        judul="Kosakata ikon"
        keterangan={
          <>
            Lucide lewat komponen <Kode>Ikon</Kode>: garis 1,75, ukuran 16 atau 20. Ikon di luar daftar ini perlu arti baru,
            bukan variasi.
          </>
        }
        polos
      >
        <div className={g.kosakata}>
          {[IKON.slice(0, separuh), IKON.slice(separuh)].map((kolom, i) => (
            <ul key={i} className={g.ikonDaftar}>
              {kolom.map((k) => (
                <li key={k.nama} className={g.ikonBaris}>
                  <span className={g.ikonUkuran}>
                    <Ikon ikon={k.ikon} />
                    <Ikon ikon={k.ikon} ukuran={20} />
                  </span>
                  <span className={g.ikonArti}>{k.arti}</span>
                  <code className={g.ikonNama}>{k.nama}</code>
                </li>
              ))}
            </ul>
          ))}
        </div>
      </Pelat>

      <DaftarAturan
        butir={[
          "16 px sebaris teks dan di tombol berlabel; 20 px di tombol ikon dan di keadaan kosong atau galat. Tidak ada ukuran lain.",
          "Ikon mewarisi warna teks. Warna semantik hanya untuk ikon status, mis. segitiga peringatan --merah.",
          "Ikon saja untuk tutup, cari, menu, dan tema, dengan nama aksesibel. Aksi domain tetap berlabel terlihat.",
        ]}
      />

      <Pelat
        nomor="7.2"
        judul="Kurva dan durasi"
        keterangan={
          <>
            Satu kurva untuk semua transisi, <Kode>--ease-out</Kode> = {akar["--ease-out"]}: cepat di awal agar terasa langsung
            menjawab, pelan di akhir. Dengan gerak minimal, <Kode>--t-move</Kode> menjadi 0 dan balok di sini berpindah tanpa
            animasi.
          </>
        }
      >
        <div className={g.gerakTata}>
          <KurvaEase p={kurva} />
          <DemoGerak baris={DURASI.map((d) => ({ ...d, ms: akar[d.token] }))} />
        </div>
      </Pelat>

      <Pelat
        nomor="7.3"
        judul="Gerak yang dipakai"
        keterangan="Tidak ada angka yang menghitung naik, elemen yang muncul saat digulir, paralaks, pemintal di atas data yang sudah ada, atau pantulan tanpa momentum gestur."
        polos
      >
        <Tabel judul="Gerak" gulir>
          <thead>
            <tr>
              <th scope="col">Gerak</th>
              <th scope="col">Durasi</th>
              <th scope="col">Saat gerak minimal</th>
            </tr>
          </thead>
          <tbody>
            {GERAK.map((b) => (
              <tr key={b.gerak}>
                <th scope="row">{b.gerak}</th>
                <td className={g.durasiSel}>{b.durasi}</td>
                <td>{b.minimal}</td>
              </tr>
            ))}
          </tbody>
        </Tabel>
      </Pelat>
    </Bagian>
  );
}
