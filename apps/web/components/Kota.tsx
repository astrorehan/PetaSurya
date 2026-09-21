"use client";

import { useCallback, useState } from "react";
import { SKALA_KWP } from "@petasurya/ui";
import { Peta, type WilayahPeta } from "./Peta";
import s from "./kota.module.css";

type KotaProps = {
  kode: string;
  wilayah: WilayahPeta[];
};

export function KotaInteraktif({ kode, wilayah }: KotaProps) {
  const [wilayahTerpilih, setWilayahTerpilih] = useState<string | null>(null);
  const pilihWilayah = useCallback((id: string) => setWilayahTerpilih(id), []);
  const pilihan = wilayah.find((item) => item.id === wilayahTerpilih) ?? null;

  return (
    <main className={s.halaman}>
      <header className={s.kepala}>
        <div>
          <p className={s.label}>MODE KOTA</p>
          <h1 className={s.judul}>Potensi Kota Bengkulu</h1>
          <p className={s.pengantar}>
            Pilih batas kecamatan untuk melihat status analisis dan skala kapasitas atap. Agregat wilayah belum dihitung
            sebelum bangunan dianalisis oleh mesin.
          </p>
        </div>
        <span className={s.kode}>KODE {kode}</span>
      </header>

      <div className={s.gridUtama}>
        <section className={s.kartuPeta} aria-labelledby="judul-peta-kota">
          <div className={s.metaPeta}>
            <div>
              <p className={s.label}>BATAS KECAMATAN</p>
              <h2 id="judul-peta-kota">Wilayah yang tersedia dari OSM</h2>
            </div>
            <span className={s.metaSumber}>{wilayah.length} relasi admin_level 6</span>
          </div>
          <Peta
            label="Peta batas kecamatan Kota Bengkulu"
            tinggi={500}
            wilayah={wilayah}
            wilayahTerpilih={wilayahTerpilih}
            onPilihWilayah={pilihWilayah}
            tampilanKosong
          />
          <p className={s.catatanPeta}>
            Klik poligon untuk menyorot kecamatan. Arsir menunjukkan data kapasitas belum tersedia; batas lain yang belum
            ada di OSM tidak digambar.
          </p>
        </section>

        <aside className={s.panel} aria-label="Ringkasan potensi wilayah">
          <div>
            <p className={s.label}>RINGKASAN WILAYAH</p>
            <h2 className={s.judulPanel}>{pilihan?.nama ?? "Belum ada simulasi"}</h2>
            <p className={s.teksPanel}>
              {pilihan ? "Batas terpilih dari OpenStreetMap. Analisis bangunan belum dijalankan." : "Pilih satu kecamatan pada peta untuk melihat statusnya."}
            </p>
          </div>

          <div className={s.kartuKosong}>
            <span className={s.labelKecil}>TOTAL KAPASITAS WILAYAH</span>
            <strong>Belum ada simulasi</strong>
            <span className={s.unit}>kWp · menunggu analisis bangunan</span>
          </div>

          <div className={s.adopsi}>
            <div className={s.barisLabel}>
              <label htmlFor="adopsi-kota">Skenario adopsi</label>
              <span>—</span>
            </div>
            <input id="adopsi-kota" type="range" min="0" max="100" value="0" disabled aria-describedby="catatan-adopsi-kota" />
            <p id="catatan-adopsi-kota">Nonaktif sampai agregasi kapasitas tersambung ke mesin.</p>
          </div>

          <div className={s.legenda} aria-label="Legenda skala kWp">
            <p className={s.labelKecil}>LEGENDA SKALA KWP</p>
            <p className={s.teksLegenda}>Skala referensi; data wilayah belum diisi.</p>
            <div className={s.swatchGrid}>
              {SKALA_KWP.map((kelas) => (
                <div className={s.swatchItem} key={kelas.batas}>
                  <span className={s.swatch} style={{ backgroundColor: kelas.warna }} aria-hidden="true" />
                  <span>{kelas.batas === 200 ? "≥ 200" : kelas.batas} kWp</span>
                </div>
              ))}
            </div>
          </div>
        </aside>
      </div>

      <section className={s.daftar} aria-labelledby="judul-daftar-kecamatan">
        <div className={s.judulDaftar}>
          <div>
            <p className={s.label}>DATA WILAYAH</p>
            <h2 id="judul-daftar-kecamatan">Kecamatan dengan batas OSM</h2>
          </div>
          <span className={s.metaSumber}>Belum dianalisis</span>
        </div>
        <div className={s.daftarGrid}>
          {wilayah.map((item) => (
            <button
              className={`${s.itemWilayah} ${item.id === wilayahTerpilih ? s.itemTerpilih : ""}`}
              type="button"
              aria-pressed={item.id === wilayahTerpilih}
              key={item.id}
              onClick={() => pilihWilayah(item.id)}
            >
              <span>{item.nama}</span>
              <small>Belum dianalisis</small>
            </button>
          ))}
        </div>
      </section>
    </main>
  );
}
