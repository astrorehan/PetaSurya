import type { BangunanRingkas, PaketPemindaian } from "@petasurya/contracts";
import demo from "../../../data/fixtures/demo.json";
import katalog from "../../../data/fixtures/katalog-bangunan.json";

export type Titik = [number, number];
export const KATALOG_BANGUNAN = katalog.bangunan as unknown as BangunanRingkas[];
export const BATAS_KOTA = katalog._sumber.batas_kota_bbox as [number,number,number,number];
export const PROFIL_SIMULASI = {
  rumah: { nama: "Rumah 2.200 VA", data: demo.find(d => d.bangunan.id === 1145010599)!.simulasi },
  usaha: { nama: "Toko 5.500 VA", data: demo.find(d => d.bangunan.id === 991016391)!.simulasi },
  gedung: { nama: "Gedung 197.000 VA", data: demo.find(d => d.bangunan.id === 1146141501)!.simulasi },
};
export type ProfilSimulasi = keyof typeof PROFIL_SIMULASI;

export function profilBangunan(b: BangunanRingkas): ProfilSimulasi {
  const awal = demo.find(d => d.bangunan.id === b.id)?.simulasi.asumsi.golongan_tarif;
  if (awal?.startsWith("B-2") || ["university", "school"].includes(b.building_tag ?? "")) return "gedung";
  if (awal?.startsWith("B-1") || ["retail", "commercial"].includes(b.building_tag ?? "")) return "usaha";
  return "rumah";
}

export function paketContoh(id: number): PaketPemindaian | undefined {
  const d = demo.find(d => d.bangunan.id === id);
  if (!d) return;
  return { bangunan: d.bangunan, analisis: d.analisis, bingkai: { ...d.viewer.bingkai, tiles: d.viewer.tiles, meter_per_piksel: d.viewer.meter_per_piksel }, durasi_detik: 0, tersimpan: true } as unknown as PaketPemindaian;
}

export function simulasiContoh(id: number) { return demo.find(d => d.bangunan.id === id)?.simulasi; }

export function potensiLuas(p: PaketPemindaian): number {
  const modul=PROFIL_SIMULASI.rumah.data.parameter_fisika.modul;
  return Math.floor((p.analisis?.usable_area_m2 ?? 0)/(modul.panjang_m*modul.lebar_m))*modul.wp/1000;
}

export function areaSkenario(kapasitas: number, profil: ProfilSimulasi): number {
  const modul=PROFIL_SIMULASI[profil].data.parameter_fisika.modul;
  return kapasitas*1000/modul.wp*modul.panjang_m*modul.lebar_m;
}

export function namaBangunan(b: BangunanRingkas): string {
  if (b.nama) return b.nama;
  return `${b.building_tag === "house" ? "Rumah" : "Bangunan"} ${b.id}`;
}

function centroid(ring: number[][]): Titik {
  const [ox, oy] = ring[0];
  let luas = 0, sx = 0, sy = 0;
  for (let i = 1; i < ring.length; i++) {
    const [x1, y1] = [ring[i-1][0]-ox, ring[i-1][1]-oy];
    const [x2, y2] = [ring[i][0]-ox, ring[i][1]-oy];
    const cross = x1*y2-x2*y1;
    luas += cross; sx += (x1+x2)*cross; sy += (y1+y2)*cross;
  }
  return [ox+sx/(3*luas),oy+sy/(3*luas)];
}

/** Titik di dalam cincin luar bangunan [bujur, lintang], untuk mencari wilayah dan cuaca. */
export function pusatBangunan(b: BangunanRingkas): Titik {
  return centroid(b.geom.coordinates[0]);
}

export function paketBangunan(b: BangunanRingkas): PaketPemindaian {
  const tersimpan = paketContoh(b.id);
  if (tersimpan) return tersimpan;
  const [lon,lat] = centroid(b.geom.coordinates[0]);
  const zoom = 19, lebar = 640, tinggi = 480, n = 256*2**zoom;
  const x0 = (lon+180)/360*n-lebar/2;
  const y0 = (1-Math.asinh(Math.tan(lat*Math.PI/180))/Math.PI)/2*n-tinggi/2;
  const tiles = [];
  for(let y=Math.floor(y0/256); y<Math.ceil((y0+tinggi)/256);y++) for(let x=Math.floor(x0/256); x<Math.ceil((x0+lebar)/256);x++) {
    tiles.push({x:x*256-x0,y:y*256-y0,url:`https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/${zoom}/${y}/${x}`});
  }
  return {bangunan:b,analisis:null,tersimpan:false,durasi_detik:0,bingkai:{x0,y0,zoom,lebar,tinggi,tiles,meter_per_piksel:2*Math.PI*6378137*Math.cos(lat*Math.PI/180)/n}};
}

export function tampilanPaket(p: PaketPemindaian) {
  const f=p.bingkai, n=256*2**f.zoom;
  const pixel=([lon,lat]:number[]):Titik=>[(lon+180)/360*n-f.x0,(1-Math.asinh(Math.tan(lat*Math.PI/180))/Math.PI)/2*n-f.y0];
  const footprint=p.bangunan.geom.coordinates[0].map(pixel);
  const xs=footprint.map(p=>p[0]),ys=footprint.map(p=>p[1]);
  const bbox:[number,number,number,number]=[Math.min(...xs),Math.min(...ys),Math.max(...xs)-Math.min(...xs),Math.max(...ys)-Math.min(...ys)];
  const mask_rings=p.analisis?.mask_geojson?.coordinates.map(poly=>poly.map(ring=>ring.map(pixel)))??[];
  return {footprint,bbox,mask_rings};
}
