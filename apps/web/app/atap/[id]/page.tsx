import { HasilAtap, KeadaanAtap } from "../../../components/HasilAtap";
import { DATA_DEMO } from "../../../lib/demo";

const ALIAS: Record<string, number> = {
  contoh: 991016391, "3f8c-contoh": 991016391,
  rumah: 1145010599, limun: 1145010599,
  unib: 1146141501, kampus: 1146141501,
};

export default async function HalamanAtap({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const idBersih = decodeURIComponent(id).trim().toLowerCase();
  if (idBersih === "galat" || idBersih === "error") return <KeadaanAtap jenis="galat" id={id} />;
  const identitas = ALIAS[idBersih] ?? Number(idBersih);
  const data = DATA_DEMO.find((item) => item.bangunan.id === identitas);
  if (!data) return <KeadaanAtap jenis="kosong" id={id} />;
  return <HasilAtap id={id} {...data} />;
}
