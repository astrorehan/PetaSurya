import { describe, expect, it } from "vitest";
import analisisCvJson from "../../../data/fixtures/analisis/cv-toko-wr-supratman.json";
import analisisFallbackJson from "../../../data/fixtures/analisis/fallback-rumah-kandang-limun.json";
import analisisKampusJson from "../../../data/fixtures/analisis/cv-kampus-fh-unib.json";
import bangunanRumahJson from "../../../data/fixtures/bangunan/rumah-kandang-limun.json";
import bangunanTokoJson from "../../../data/fixtures/bangunan/toko-wr-supratman.json";
import bangunanKampusJson from "../../../data/fixtures/bangunan/kampus-fh-unib.json";
import simulasiJson from "../../../data/fixtures/simulasi/contoh-3f8c.json";
import simulasiKampusJson from "../../../data/fixtures/simulasi/contoh-unib-1146141501.json";
import simulasiLimunJson from "../../../data/fixtures/simulasi/contoh-limun-1145010599.json";

describe("Halaman Atap [id] — Integritas Pemetaan Fixture", () => {
  const DATA_CONTOH = {
    contoh: { bangunan: bangunanTokoJson, analisis: analisisCvJson, simulasi: simulasiJson },
    "3f8c-contoh": { bangunan: bangunanTokoJson, analisis: analisisCvJson, simulasi: simulasiJson },
    "991016391": { bangunan: bangunanTokoJson, analisis: analisisCvJson, simulasi: simulasiJson },
    "1145010599": { bangunan: bangunanRumahJson, analisis: analisisFallbackJson, simulasi: simulasiLimunJson },
    rumah: { bangunan: bangunanRumahJson, analisis: analisisFallbackJson, simulasi: simulasiLimunJson },
    limun: { bangunan: bangunanRumahJson, analisis: analisisFallbackJson, simulasi: simulasiLimunJson },
    "1146141501": { bangunan: bangunanKampusJson, analisis: analisisKampusJson, simulasi: simulasiKampusJson },
    unib: { bangunan: bangunanKampusJson, analisis: analisisKampusJson, simulasi: simulasiKampusJson },
    kampus: { bangunan: bangunanKampusJson, analisis: analisisKampusJson, simulasi: simulasiKampusJson },
  };

  it("mendaftarkan 9 rute alias yang valid tanpa entri undefined", () => {
    const keys = Object.keys(DATA_CONTOH);
    expect(keys).toHaveLength(9);
    for (const key of keys) {
      const data = DATA_CONTOH[key as keyof typeof DATA_CONTOH];
      expect(data).toBeDefined();
      expect(data.bangunan).toBeDefined();
      expect(data.analisis).toBeDefined();
      expect(data.simulasi).toBeDefined();
    }
  });

  it("Rumah Kandang Limun (1145010599) menggunakan simulasi spesifik residensial bukan simulasi toko", () => {
    const limun = DATA_CONTOH["1145010599"];
    expect(limun.simulasi.id).toBe("8c1f1145-limun-4011-8f92-rk1145010599");
    expect(limun.simulasi.kwp).toBe(50.05);
    expect(limun.simulasi.module_count).toBe(91);
    expect(limun.simulasi.asumsi.golongan_tarif).toBe("R-1/TR");
    expect(limun.simulasi.asumsi.daya_va).toBe(2200);

    // Pastikan tidak menggunakan id simulasi toko (3f8c-contoh)
    expect(limun.simulasi.id).not.toBe("3f8c-contoh");
  });

  it("Fakultas Hukum UNIB (1146141501) menggunakan simulasi skala kampus", () => {
    const unib = DATA_CONTOH["1146141501"];
    expect(unib.simulasi.kwp).toBe(202.4);
    expect(unib.simulasi.module_count).toBe(460);
    expect(unib.simulasi.asumsi.golongan_tarif).toBe("B-2/TR");
  });

  it("Toko WR Supratman (991016391) menggunakan simulasi komersial 14.3 kWp", () => {
    const toko = DATA_CONTOH["991016391"];
    expect(toko.simulasi.kwp).toBe(14.3);
    expect(toko.simulasi.module_count).toBe(26);
    expect(toko.simulasi.id).toBe("3f8c-contoh");
  });
});
