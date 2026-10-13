import type { AnalisisAtap, BangunanRingkas, HasilSimulasi } from "@petasurya/contracts";
import data from "../../../data/fixtures/demo.json";

export const DATA_DEMO = data as unknown as Array<{
  bangunan: BangunanRingkas;
  analisis: AnalisisAtap;
  simulasi: HasilSimulasi;
}>;
