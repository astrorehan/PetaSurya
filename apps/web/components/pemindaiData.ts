import demo from "../../../data/fixtures/demo.json";

export type TileCitra = { x: number; y: number; url: string };
type Titik = [number, number];
type Modul = { id: number; x: number; y: number; w: number; h: number; string_id: number };

export type BangunanTargetPindai = {
  id: number; nama: string; kategori: string; koordinat: Titik;
  footprint_m2: number; roof_area_m2: number; usable_area_m2: number;
  obstruction_frac: number; tilt_deg: number; azimuth_deg: number;
  arah_label: string; roof_type: string; confidence: number;
  method: "cv" | "footprint_fallback"; model_version: string;
  tiles: TileCitra[]; polygon: Titik[]; mask_rings: Titik[][][];
  bbox: [number, number, number, number]; centroid: Titik;
  ridges: [number, number, number, number][];
  azimuth_vec: [number, number, number, number];
  obstructions: Array<{ id: string; label: string; x: number; y: number; w: number; h: number;
    tipe: "tandon" | "ac" | "shaft" | "pohon"; keterangan: string }>;
  pv_modules_550: Modul[];
  specs: { 550: { count: number; kwp: number; e_ac_kwh_yr1: number; savings_idr_yr1: number } };
  cv_logs: Array<{ tahap: number; waktu: string; sub: string; pesan: string }>;
  iou_footprint: number; durasi_detik: number; peringatan?: string;
};

function dalamCincin([x, y]: Titik, ring: Titik[]) {
  let dalam = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i]; const [xj, yj] = ring[j];
    if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) dalam = !dalam;
  }
  return dalam;
}

function sketsaModul(rings: Titik[][][], bbox: number[], mpp: number, count: number): Modul[] {
  const [bx, by, bw, bh] = bbox;
  const w = 1.134 / mpp; const h = 2.278 / mpp;
  const memuat = (t: Titik) => rings.some((r) => dalamCincin(t, r[0]) && !r.slice(1).some((lubang) => dalamCincin(t, lubang)));
  const hasil: Modul[] = [];
  for (let y = by + 2; y + h < by + bh - 2 && hasil.length < count; y += h + 1) {
    for (let x = bx + 2; x + w < bx + bw - 2 && hasil.length < count; x += w + 1) {
      if ([[x, y], [x + w, y], [x, y + h], [x + w, y + h], [x + w / 2, y + h / 2]].every((t) => memuat(t as Titik))) {
        hasil.push({ id: hasil.length + 1, x, y, w, h, string_id: 1 });
      }
    }
  }
  return hasil;
}

export const DAFTAR_BANGUNAN: BangunanTargetPindai[] = demo.map(({ bangunan: b, analisis: a, simulasi: s, viewer: v }) => {
  const pusat = v.centroid as Titik;
  const sudut = a.azimuth_deg * Math.PI / 180;
  const rings = v.mask_rings as Titik[][][];
  return {
    id: b.id, nama: b.nama ?? `Bangunan ${b.id}`, kategori: b.building_tag ?? "Bangunan",
    koordinat: [b.geom.coordinates[0][0][1], b.geom.coordinates[0][0][0]],
    footprint_m2: b.footprint_m2, roof_area_m2: a.roof_area_m2, usable_area_m2: a.usable_area_m2,
    obstruction_frac: a.obstruction_frac, tilt_deg: a.tilt_deg, azimuth_deg: a.azimuth_deg,
    arah_label: `Sumbu ${a.azimuth_deg.toLocaleString("id-ID")}°; hadap panel asumsi`,
    roof_type: a.roof_type, confidence: a.confidence, method: a.method as "cv" | "footprint_fallback",
    model_version: a.model_version, tiles: v.tiles,
    polygon: v.footprint as Titik[], mask_rings: rings, bbox: v.bbox as [number, number, number, number],
    centroid: pusat, ridges: [],
    azimuth_vec: [pusat[0], pusat[1], pusat[0] + 48 * Math.sin(sudut), pusat[1] - 48 * Math.cos(sudut)],
    obstructions: [], pv_modules_550: sketsaModul(rings, v.bbox, v.meter_per_piksel, s.module_count),
    specs: { 550: { count: s.module_count, kwp: s.kwp, e_ac_kwh_yr1: s.e_ac_kwh_yr1, savings_idr_yr1: s.savings_idr_yr1 } },
    iou_footprint: v.evaluasi.iou_footprint, durasi_detik: v.evaluasi.durasi_detik,
    peringatan: "peringatan" in a ? String(a.peringatan) : undefined,
    cv_logs: [
      { tahap: 1, waktu: "1", sub: "Citra", pesan: "Citra z=19; poligon dan kotak dari OSM." },
      { tahap: 2, waktu: "2", sub: "Segmentasi", pesan: `Inferensi tersimpan: ${v.evaluasi.durasi_detik.toLocaleString("id-ID")} detik. IoU vs OSM: ${v.evaluasi.iou_footprint.toLocaleString("id-ID", { maximumFractionDigits: 3 })}. ${a.method === "cv" ? "Mask dipakai." : "Mask ditolak; memakai perkiraan footprint."}` },
      { tahap: 3, waktu: "3", sub: "Area", pesan: "Cadangan area 15% adalah asumsi; halangan belum diukur." },
      { tahap: 4, waktu: "4", sub: "Orientasi", pesan: "Sumbu dari persegi panjang minimum; kemiringan 15° dan hadap panel adalah asumsi." },
      { tahap: 5, waktu: "5", sub: "Panel", pesan: "Kapasitas dihitung dari luas tersedia dan dimensi modul Jinko 550 Wp. Sketsa bukan rancangan pemasangan." },
    ],
  };
});

export const TAHAP_INFO = [
  { nomor: 1, nama: "Citra", subjudul: "Citra dan batas bangunan", penjelasan: "Citra Esri z=19 dipadankan dengan footprint OSM. Citra latar membutuhkan internet; hasil analisis sudah tersimpan." },
  { nomor: 2, nama: "Segmentasi", subjudul: "Mask hasil MobileSAM", penjelasan: "Kotak dan centroid OSM memandu inferensi ONNX. IoU terhadap OSM dihitung sebelum pemotongan mask. Mask yang kurang sesuai memakai fallback." },
  { nomor: 3, nama: "Area", subjudul: "Cadangan area sebagai asumsi", penjelasan: "Luas mask dihitung pada ellipsoid WGS84. Cadangan area 15% belum diukur. Halangan dan bayangan belum dianalisis." },
  { nomor: 4, nama: "Sumbu", subjudul: "Orientasi dan kemiringan", penjelasan: "Sumbu panjang berasal dari persegi panjang minimum. Sumbu tidak menentukan arah hadap panel. Kemiringan 15° dan hadap panel tetap asumsi simulasi." },
  { nomor: 5, nama: "Panel", subjudul: "Kapasitas dari luas tersedia", penjelasan: "Jumlah panel dihitung dari luas tersedia dan dimensi Jinko F5. Sketsa menunjukkan sebagian susunan yang mungkin, bukan rancangan teknis pemasangan." },
];
