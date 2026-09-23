import type { AnalisisAtap, BangunanRingkas, HasilSimulasi } from "@petasurya/contracts";
import analisisCvJson from "../../../../../data/fixtures/analisis/cv-toko-wr-supratman.json";
import analisisFallbackJson from "../../../../../data/fixtures/analisis/fallback-rumah-kandang-limun.json";
import bangunanRumahJson from "../../../../../data/fixtures/bangunan/rumah-kandang-limun.json";
import bangunanTokoJson from "../../../../../data/fixtures/bangunan/toko-wr-supratman.json";
import simulasiJson from "../../../../../data/fixtures/simulasi/contoh-3f8c.json";
import analisisKampusJson from "../../../../../data/fixtures/analisis/cv-kampus-fh-unib.json";
import bangunanKampusJson from "../../../../../data/fixtures/bangunan/kampus-fh-unib.json";
import simulasiKampusJson from "../../../../../data/fixtures/simulasi/contoh-unib-1146141501.json";
import { HasilAtap, KeadaanAtap } from "../../../components/HasilAtap";

const analisisCv = analisisCvJson as unknown as AnalisisAtap;
const analisisFallback = analisisFallbackJson as unknown as AnalisisAtap;
const analisisKampus = analisisKampusJson as unknown as AnalisisAtap;
const bangunanRumah = bangunanRumahJson as unknown as BangunanRingkas;
const bangunanToko = bangunanTokoJson as unknown as BangunanRingkas;
const bangunanKampus = bangunanKampusJson as unknown as BangunanRingkas;
const simulasi = simulasiJson as unknown as HasilSimulasi;
const simulasiKampus = simulasiKampusJson as unknown as HasilSimulasi;

type DataAtap = {
  bangunan: BangunanRingkas;
  analisis: AnalisisAtap;
  simulasi: HasilSimulasi;
};

const DATA_CONTOH: Record<string, DataAtap> = {
  contoh: { bangunan: bangunanToko, analisis: analisisCv, simulasi },
  "3f8c-contoh": { bangunan: bangunanToko, analisis: analisisCv, simulasi },
  "991016391": { bangunan: bangunanToko, analisis: analisisCv, simulasi },
  "1145010599": { bangunan: bangunanRumah, analisis: analisisFallback, simulasi },
  "1146141501": { bangunan: bangunanKampus, analisis: analisisKampus, simulasi: simulasiKampus },
  "unib": { bangunan: bangunanKampus, analisis: analisisKampus, simulasi: simulasiKampus },
  "kampus": { bangunan: bangunanKampus, analisis: analisisKampus, simulasi: simulasiKampus },
};

export default async function HalamanAtap({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const idBersih = decodeURIComponent(id).trim().toLowerCase();

  if (idBersih === "galat" || idBersih === "error") {
    return <KeadaanAtap jenis="galat" id={id} />;
  }

  const data = DATA_CONTOH[idBersih];
  if (!data) return <KeadaanAtap jenis="kosong" id={id} />;

  return <HasilAtap id={id} {...data} />;
}
