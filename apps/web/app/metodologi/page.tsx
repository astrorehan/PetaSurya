import s from "./metodologi.module.css";

export const metadata = { title: "Metodologi" };

const RUMUS_L3 = [
  "POA = POA_langsung + POA_baur + POA_pantul_tanah",
  "POA_langsung = DNI × cos(AOI)",
  "POA_baur = model Perez",
  "T_sel = T_amb + (POA / 1000) × (T_NOCT − 20) / 0,8",
  "E_AC(n) = Σ P_AC × (1 − degradasi)^(n−1)",
].join("\n");
const RUMUS_L4 = [
  "CAPEX = kWp × biaya_per_kWp",
  "Savings_1 = E_AC × [SCR + (1−SCR) × faktor_ekspor] × tarif",
  "Payback = tahun saat Σ Kas_n ≥ CAPEX",
  "NPV = −CAPEX + Σ Kas_n / (1 + r)^n",
  "IRR = r yang membuat NPV = 0",
].join("\n");
const RUMUS_L5 = [
  "CO2_n = E_AC(n) / 1000 × EF_grid",
  "CO2_25thn = Σ CO2_n",
  "EMB_total = Σ E_AC(n) × 0,045 / 1000",
  "CO2_bersih = CO2_25thn − EMB_total",
  "EPBT = energi_terlekat_kWh / E_AC_tahunan",
].join("\n");

export default function Metodologi() {
  return (
    <main className={s.halaman}>
      <header className={s.kepala}>
        <p className={s.label}>METODOLOGI</p>
        <h1 className={s.judul}>Setiap angka punya jejak.</h1>
        <p className={s.pengantar}>PetaSurya memisahkan geometri, fisika, ekonomi, dan karbon. Setiap lapisan punya masukan, rumus, dan batas uji.</p>
      </header>

      <section className={s.rantai} aria-label="Rantai perhitungan">
        <div><span className={s.nomor}>L3</span><strong>Fisika</strong><span>iradiansi → kWh AC</span></div>
        <div><span className={s.nomor}>L4</span><strong>Ekonomi</strong><span>kWh → rupiah</span></div>
        <div><span className={s.nomor}>L5</span><strong>Karbon</strong><span>kWh → tCO₂e</span></div>
      </section>

      <section className={s.rumusGrid} aria-label="Rumus lapisan mesin">
        <article className={s.rumusKartu}>
          <p className={s.label}>L3 · FISIKA</p>
          <h2>Energi AC dari matahari.</h2>
          <p className={s.prosa}>Masukan L3 adalah iradiansi bulanan, geometri atap, kemiringan, dan azimut. Rantai ini deterministik: tidak ada AI di dalamnya.</p>
          <pre className={s.blokRumus}><code>{RUMUS_L3}</code></pre>
          <p className={s.rujukan}>Rujukan: cetak biru §05 · uji pembanding terhadap pvlib, toleransi deviasi energi &lt; 2%.</p>
        </article>

        <article className={s.rumusKartu}>
          <p className={s.label}>L4 · EKONOMI</p>
          <h2>Energi menjadi keputusan.</h2>
          <p className={s.prosa}>Ekonomi menjadikan tarif, SCR, biaya, degradasi, dan ekspor sebagai parameter. Asumsi terlihat agar hasil bisa dihitung ulang.</p>
          <pre className={s.blokRumus}><code>{RUMUS_L4}</code></pre>
          <p className={s.rujukan}>Rujukan: cetak biru §06 · payback nullable bila sistem tidak balik modal dalam umur pakai.</p>
        </article>

        <article className={s.rumusKartu}>
          <p className={s.label}>L5 · KARBON</p>
          <h2>Emisi kotor, terlekat, bersih.</h2>
          <p className={s.prosa}>Karbon tidak berhenti pada angka emisi yang dihindari. Produksi panel dan inverter juga dicatat sebagai karbon terlekat.</p>
          <pre className={s.blokRumus}><code>{RUMUS_L5}</code></pre>
          <p className={s.rujukan}>Rujukan: cetak biru §07 · faktor emisi dan karbon terlekat wajib memiliki sumber.</p>
        </article>
      </section>

      <section className={s.kejujuran} aria-labelledby="judul-kejujuran">
        <p className={s.label}>FITUR KEPERCAYAAN</p>
        <h2 id="judul-kejujuran">Kejujuran sebagai fitur.</h2>
        <div className={s.kejujuranGrid}>
          <p className={s.prosa}>Angka contoh diberi label. Angka yang tidak punya sumber tidak masuk sebagai konstanta. Hasil buruk tetap tampil.</p>
          <ul>
            <li>Presisi penuh tersedia lewat jejak perhitungan.</li>
            <li>Payback lebih dari 25 tahun ditulis tanpa presisi palsu.</li>
            <li>Keyakinan rendah dijelaskan sebagai perkiraan, bukan disamarkan.</li>
          </ul>
        </div>
      </section>
    </main>
  );
}
