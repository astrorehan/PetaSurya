import { KATALOG_BANGUNAN } from "../lib/pemindaian";
import { BerandaInteraktif } from "../components/Beranda";
import { muatKatalog } from "../lib/api";

const bangunan = KATALOG_BANGUNAN;

export default async function Beranda({ searchParams }: { searchParams?: Promise<{ q?: string | string[] }> }) {
  const params = searchParams ? await searchParams : {};
  const query = Array.isArray(params.q) ? params.q[0] ?? "" : params.q ?? "";
  const tersedia=await muatKatalog().catch(()=>bangunan);
  return <BerandaInteraktif bangunan={tersedia} query={query} />;
}
