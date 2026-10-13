import { DATA_DEMO } from "../lib/demo";
import { BerandaInteraktif } from "../components/Beranda";

const bangunan = DATA_DEMO.map((data) => data.bangunan);

export default async function Beranda({ searchParams }: { searchParams?: Promise<{ q?: string | string[] }> }) {
  const params = searchParams ? await searchParams : {};
  const query = Array.isArray(params.q) ? params.q[0] ?? "" : params.q ?? "";
  return <BerandaInteraktif bangunan={bangunan} query={query} />;
}
