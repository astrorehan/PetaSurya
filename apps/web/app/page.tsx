import type { BangunanRingkas } from "@petasurya/contracts";
import kampusJson from "../../../data/fixtures/bangunan/kampus-fh-unib.json";
import rumahJson from "../../../data/fixtures/bangunan/rumah-kandang-limun.json";
import tokoJson from "../../../data/fixtures/bangunan/toko-wr-supratman.json";
import { BerandaInteraktif } from "../components/Beranda";

const bangunan: BangunanRingkas[] = [kampusJson, rumahJson, tokoJson] as unknown as BangunanRingkas[];

export default async function Beranda({ searchParams }: { searchParams?: Promise<{ q?: string | string[] }> }) {
  const params = searchParams ? await searchParams : {};
  const query = Array.isArray(params.q) ? params.q[0] ?? "" : params.q ?? "";
  return <BerandaInteraktif bangunan={bangunan} query={query} />;
}
