import demo from "../../../data/fixtures/demo.json";

export type TileCitra = { x: number; y: number; url: string };
type Titik = [number, number];

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
  luas_modul_m2: number;
  specs: { 550: { count: number; kwp: number; e_ac_kwh_yr1: number; savings_idr_yr1: number } };
  cv_logs: Array<{ tahap: number; waktu: string; sub: string; pesan: string }>;
  iou_footprint: number; durasi_detik: number; peringatan?: string;
};

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
    obstructions: [], luas_modul_m2: s.parameter_fisika.modul.panjang_m * s.parameter_fisika.modul.lebar_m,
    specs: { 550: { count: s.module_count, kwp: s.kwp, e_ac_kwh_yr1: s.e_ac_kwh_yr1, savings_idr_yr1: s.savings_idr_yr1 } },
    iou_footprint: v.evaluasi.iou_footprint, durasi_detik: v.evaluasi.durasi_detik,
    peringatan: "peringatan" in a ? String(a.peringatan) : undefined,
    cv_logs: [
      { tahap: 1, waktu: "1", sub: "Citra", pesan: "Citra z=19; poligon dan kotak dari OSM." },
      { tahap: 2, waktu: "2", sub: "Segmentasi", pesan: `Inferensi tersimpan: ${v.evaluasi.durasi_detik.toLocaleString("id-ID")} detik. IoU vs OSM: ${v.evaluasi.iou_footprint.toLocaleString("id-ID", { maximumFractionDigits: 3 })}. ${a.method === "cv" ? "Mask dipakai." : "Mask ditolak; memakai perkiraan footprint."}` },
      { tahap: 3, waktu: "3", sub: "Area", pesan: "Cadangan area 15% adalah asumsi; halangan belum diukur." },
      { tahap: 4, waktu: "4", sub: "Orientasi", pesan: "Sumbu dari persegi panjang minimum; kemiringan 15° dan hadap panel adalah asumsi." },
      { tahap: 5, waktu: "5", sub: "Potensi", pesan: "Jumlah modul setara dihitung dari luas perhitungan dibagi luas modul. Batas atap dan kapasitas pasang belum diverifikasi." },
    ],
  };
});

export const TAHAP_INFO = [
  { nomor: 1, nama: "Bangunan", subjudul: "Pilih bangunan yang akan dianalisis", penjelasan: "Pilih bangunan OSM, lalu jalankan analisis atau buka hasil tersimpan." },
  { nomor: 2, nama: "Batas & luas", subjudul: "Tinjau batas dan luas atap", penjelasan: "Batas mengikuti citra. Cadangan area 15% masih asumsi; halangan dan bayangan belum diukur." },
  { nomor: 3, nama: "Potensi", subjudul: "Energi dan penghematan", penjelasan: "Jumlah modul setara berbasis luas. Orientasi, pemakaian listrik, dan biaya masih asumsi." },
];
