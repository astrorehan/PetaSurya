import fs from "node:fs";
import path from "node:path";
import { KotaInteraktif } from "../../../components/Kota";
import type { WilayahPeta } from "../../../components/Peta";

type KoleksiWilayah = {
  type: "FeatureCollection";
  features: Array<{
    properties: { id: string | number; nama: string };
    geometry: WilayahPeta["geom"];
  }>;
};

function bacaWilayah(): WilayahPeta[] {
  const berkas = path.resolve(process.cwd(), "../../data/fixtures/wilayah/kecamatan-kota-bengkulu.geojson");
  const koleksi = JSON.parse(fs.readFileSync(berkas, "utf8")) as KoleksiWilayah;
  return koleksi.features.map((fitur) => ({
    id: String(fitur.properties.id),
    nama: fitur.properties.nama,
    geom: fitur.geometry,
  }));
}

export default async function HalamanKota({ params }: { params: Promise<{ kode: string }> }) {
  const { kode } = await params;

  return <KotaInteraktif kode={kode} wilayah={bacaWilayah()} />;
}
