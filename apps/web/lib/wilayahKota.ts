import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import type { WilayahPeta } from "../components/Peta";

type KoleksiWilayah = {
  type: "FeatureCollection";
  features: Array<{
    properties: { id: string | number; nama: string };
    geometry: WilayahPeta["geom"];
  }>;
};

export function bacaWilayahKota(): WilayahPeta[] {
  const berkas = resolve(process.cwd(), "../../data/fixtures/wilayah/kecamatan-kota-bengkulu.geojson");
  const koleksi = JSON.parse(readFileSync(berkas, "utf8")) as KoleksiWilayah;
  return koleksi.features.map((fitur) => ({
    id: String(fitur.properties.id),
    nama: fitur.properties.nama,
    geom: fitur.geometry,
  }));
}
