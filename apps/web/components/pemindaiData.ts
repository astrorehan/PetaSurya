import simulasiToko from "../../../data/fixtures/simulasi/contoh-3f8c.json";
import simulasiKampus from "../../../data/fixtures/simulasi/contoh-unib-1146141501.json";
import simulasiRumah from "../../../data/fixtures/simulasi/contoh-limun-1145010599.json";

function spesifikasiDemo(simulasi: {
  module_count: number;
  kwp: number;
  e_ac_kwh_yr1: number;
  savings_idr_yr1: number;
}) {
  return {
    count: simulasi.module_count,
    kwp: simulasi.kwp,
    e_ac_kwh_yr1: simulasi.e_ac_kwh_yr1,
    savings_idr_yr1: simulasi.savings_idr_yr1,
  };
}

export type TileCitra = {
  x: number;
  y: number;
  url: string;
};

export type BangunanTargetPindai = {
  id: number;
  nama: string;
  kategori: string;
  koordinat: [number, number]; // [lat, lon]
  footprint_m2: number;
  roof_area_m2: number;
  usable_area_m2: number;
  obstruction_frac: number;
  tilt_deg: number;
  azimuth_deg: number;
  arah_label: string;
  roof_type: string;
  confidence: number;
  method: "cv" | "footprint_fallback";
  model_version: string;
  tiles: TileCitra[];
  polygon: [number, number][];
  bbox: [number, number, number, number]; // [x, y, w, h]
  ridges: [number, number, number, number][]; // [[x1, y1, x2, y2], ...]
  azimuth_vec: [number, number, number, number]; // [x1, y1, x2, y2]
  obstructions: Array<{
    id: string;
    label: string;
    x: number;
    y: number;
    w: number;
    h: number;
    tipe: "tandon" | "ac" | "shaft" | "pohon";
    keterangan: string;
  }>;
  pv_modules_550: Array<{
    id: number;
    x: number;
    y: number;
    w: number;
    h: number;
    string_id: number;
  }>;
  pv_modules_440: Array<{
    id: number;
    x: number;
    y: number;
    w: number;
    h: number;
    string_id: number;
  }>;
  specs: {
    550: { count: number; kwp: number; e_ac_kwh_yr1: number; savings_idr_yr1: number };
    440: { count: number; kwp: number; e_ac_kwh_yr1: number; savings_idr_yr1: number };
  };
  cv_logs: Array<{
    tahap: number;
    waktu: string;
    sub: string;
    pesan: string;
  }>;
  peringatan?: string;
};

// Data terkalibrasi presisi dengan sub-pixel georeferensi Esri z=19 untuk 3 bangunan nyata Kota Bengkulu
export const DAFTAR_BANGUNAN: BangunanTargetPindai[] = [
  {
    id: 991016391,
    nama: "Toko WR Supratman (Indomaret)",
    kategori: "Komersial / Ruko 2 Lantai",
    koordinat: [-3.76269, 102.27168],
    footprint_m2: 244.6,
    roof_area_m2: 112.4,
    usable_area_m2: 78.7,
    obstruction_frac: 0.19,
    tilt_deg: 22.0,
    azimuth_deg: 285.0,
    arah_label: "Barat-Laut (285°)",
    roof_type: "pelana",
    confidence: 0.81,
    method: "cv",
    model_version: "mobilesam-osmprompt-v3",
    tiles: [
      { x: -175, y: -209, url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/19/267626/411086" },
      { x: 81, y: -209, url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/19/267626/411087" },
      { x: 337, y: -209, url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/19/267626/411088" },
      { x: 593, y: -209, url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/19/267626/411089" },
      { x: -175, y: 47, url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/19/267627/411086" },
      { x: 81, y: 47, url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/19/267627/411087" },
      { x: 337, y: 47, url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/19/267627/411088" },
      { x: 593, y: 47, url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/19/267627/411089" },
      { x: -175, y: 303, url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/19/267628/411086" },
      { x: 81, y: 303, url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/19/267628/411087" },
      { x: 337, y: 303, url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/19/267628/411088" },
      { x: 593, y: 303, url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/19/267628/411089" },
    ],
    polygon: [
      [302.2, 217.8],
      [380.9, 249.6],
      [369.6, 277.7],
      [281.2, 241.9],
      [288.2, 224.6],
      [297.9, 228.5],
    ],
    bbox: [270, 206, 120, 82],
    ridges: [[291, 233, 375, 264]],
    azimuth_vec: [333, 248, 318, 205],
    obstructions: [
      { id: "obs-1", label: "Tandon Air Utama", x: 345, y: 242, w: 18, h: 18, tipe: "tandon", keterangan: "Silinder fiberglass 1.500 L di atap belakang" },
      { id: "obs-2", label: "Unit Kompresor AC", x: 310, y: 230, w: 16, h: 12, tipe: "ac", keterangan: "Kondensor inverter ruko 2 PK" },
    ],
    pv_modules_550: Array.from({ length: 26 }).map((_, i) => {
      const string_id = i < 13 ? 1 : 2;
      const idx = i % 13;
      const base_x = string_id === 1 ? 296 : 288;
      const base_y = string_id === 1 ? 224 : 244;
      return {
        id: i + 1,
        x: Math.round(base_x + idx * 5.8),
        y: Math.round(base_y + idx * 2.3),
        w: 10,
        h: 7,
        string_id,
      };
    }),
    pv_modules_440: Array.from({ length: 32 }).map((_, i) => {
      const string_id = i < 16 ? 1 : 2;
      const idx = i % 16;
      const base_x = string_id === 1 ? 294 : 286;
      const base_y = string_id === 1 ? 222 : 242;
      return {
        id: i + 1,
        x: Math.round(base_x + idx * 4.9),
        y: Math.round(base_y + idx * 2.0),
        w: 8,
        h: 6,
        string_id,
      };
    }),
    specs: {
      550: spesifikasiDemo(simulasiToko),
      440: { count: 32, kwp: 14.08, e_ac_kwh_yr1: 19530, savings_idr_yr1: 11928000 },
    },
    cv_logs: [
      { tahap: 1, waktu: "00:00.12", sub: "L1 Geodata", pesan: "Citra Esri z=19 (0,298 m/px) dimuat. Bounding box OSM way/991016391 diselaraskan." },
      { tahap: 2, waktu: "00:01.04", sub: "L2 MobileSAM", pesan: "Inference encoder ViT-Tiny ONNX selesai (IoU 0,81). 6 titik simpul kontur diekstraksi." },
      { tahap: 3, waktu: "00:01.88", sub: "L2 Filter", pesan: "2 obstruksi terdeteksi (Tandon Air, Kompresor AC). Sempadan 0,5 m diterapkan; 19% area dieksklusi." },
      { tahap: 4, waktu: "00:02.45", sub: "L2 PCA", pesan: "Garis bubungan terdeteksi (panjang 87 px). Azimut 285° (Barat-Laut) & tilt 22° terverifikasi." },
      { tahap: 5, waktu: "00:03.10", sub: "L3 Layout", pesan: "Penataan 2 string modul selesai. Siap dialirkan ke simulasi tekno-ekonomi L3–L5." },
    ],
  },
  {
    id: 1146141501,
    nama: "Fakultas Hukum UNIB",
    kategori: "Kampus / Bangunan Institusi",
    koordinat: [-3.76063, 102.26828],
    footprint_m2: 1505.3,
    roof_area_m2: 1280.0,
    usable_area_m2: 1024.0,
    obstruction_frac: 0.12,
    tilt_deg: 15.0,
    azimuth_deg: 165.0,
    arah_label: "Selatan-Tenggara (165°)",
    roof_type: "pelana (sayap ganda)",
    confidence: 0.88,
    method: "cv",
    model_version: "mobilesam-osmprompt-v3",
    tiles: [
      { x: -186, y: -209, url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/19/267623/411081" },
      { x: 70, y: -209, url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/19/267623/411082" },
      { x: 326, y: -209, url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/19/267623/411083" },
      { x: 582, y: -209, url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/19/267623/411084" },
      { x: -186, y: 47, url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/19/267624/411081" },
      { x: 70, y: 47, url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/19/267624/411082" },
      { x: 326, y: 47, url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/19/267624/411083" },
      { x: 582, y: 47, url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/19/267624/411084" },
      { x: -186, y: 303, url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/19/267625/411081" },
      { x: 70, y: 303, url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/19/267625/411082" },
      { x: 326, y: 303, url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/19/267625/411083" },
      { x: 582, y: 303, url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/19/267625/411084" },
    ],
    polygon: [
      [253.1, 219.6],
      [291.4, 340.1],
      [347.1, 322.5],
      [341.6, 305.2],
      [437.2, 274.9],
      [409.1, 186.4],
      [312.8, 216.9],
      [307.6, 200.4],
      [299.3, 203.0],
      [296.7, 194.8],
      [270.5, 203.1],
      [273.6, 213.1],
    ],
    bbox: [242, 175, 205, 175],
    ridges: [
      [270, 275, 345, 312], // Sayap Selatan
      [350, 255, 423, 231], // Sayap Utara
    ],
    azimuth_vec: [340, 250, 355, 305],
    obstructions: [
      { id: "obs-1", label: "Shaft Tangga & AC", x: 300, y: 260, w: 24, h: 18, tipe: "shaft", keterangan: "Akses struktur tangga darurat & exhaust" },
      { id: "obs-2", label: "Unit Chiller Outdoor", x: 365, y: 230, w: 26, h: 20, tipe: "ac", keterangan: "Kondensor pendingin sentral gedung fakultas" },
      { id: "obs-3", label: "Naungan Tajuk Pohon", x: 415, y: 260, w: 22, h: 22, tipe: "pohon", keterangan: "Pohon pelindung sisi timur laut atap" },
    ],
    pv_modules_550: Array.from({ length: 96 }).map((_, i) => {
      const isSouth = i < 48;
      const r = Math.floor((i % 48) / 12);
      const c = (i % 48) % 12;
      if (isSouth) {
        return {
          id: i + 1,
          x: Math.round(265 + c * 7.5 + r * 3.5),
          y: Math.round(250 + r * 15 + c * 2.5),
          w: 7,
          h: 5,
          string_id: 1,
        };
      }
      return {
        id: i + 1,
        x: Math.round(330 + c * 7.5 - r * 2.0),
        y: Math.round(210 + r * 14 - c * 2.2),
        w: 7,
        h: 5,
        string_id: 2,
      };
    }),
    pv_modules_440: Array.from({ length: 112 }).map((_, i) => {
      const isSouth = i < 56;
      const r = Math.floor((i % 56) / 14);
      const c = (i % 56) % 14;
      if (isSouth) {
        return {
          id: i + 1,
          x: Math.round(264 + c * 6.5 + r * 3.2),
          y: Math.round(248 + r * 13 + c * 2.2),
          w: 6,
          h: 4,
          string_id: 1,
        };
      }
      return {
        id: i + 1,
        x: Math.round(328 + c * 6.5 - r * 1.8),
        y: Math.round(208 + r * 12 - c * 1.9),
        w: 6,
        h: 4,
        string_id: 2,
      };
    }),
    specs: {
      550: spesifikasiDemo(simulasiKampus),
      440: { count: 520, kwp: 228.8, e_ac_kwh_yr1: 321600, savings_idr_yr1: 393998400 },
    },
    cv_logs: [
      { tahap: 1, waktu: "00:00.15", sub: "L1 Geodata", pesan: "Tile satelit Esri z=19 kampus UNIB diambil. Footprint OSM 1.505 m² dimuat." },
      { tahap: 2, waktu: "00:01.12", sub: "L2 MobileSAM", pesan: "Segmentasi sayap ganda berhasil (IoU 0,88). 12 simpul sudut poligon terdeteksi." },
      { tahap: 3, waktu: "00:01.95", sub: "L2 Filter", pesan: "3 zona eksklusi (Shaft, Chiller, Bayangan pohon) disisihkan. Area bersih: 1.024 m²." },
      { tahap: 4, waktu: "00:02.58", sub: "L2 PCA", pesan: "Dua sumbu bubungan sayap terdeteksi. Orientasi utama azimut 165° (Selatan-Tenggara), tilt 15°." },
      { tahap: 5, waktu: "00:03.22", sub: "L3 Layout", pesan: "Kapasitas 460 modul (202,4 kWp). Simulasi institusional siap dijalankan." },
    ],
  },
  {
    id: 1145010599,
    nama: "Rumah Kandang Limun",
    kategori: "Residensial / Rumah Warga",
    koordinat: [-3.76285, 102.26545],
    footprint_m2: 277.9,
    roof_area_m2: 277.9,
    usable_area_m2: 236.2,
    obstruction_frac: 0.0,
    tilt_deg: 15.0,
    azimuth_deg: 174.2,
    arah_label: "Selatan (174°)",
    roof_type: "pelana",
    confidence: 0.34,
    method: "footprint_fallback",
    model_version: "footprint-heuristic-v1",
    tiles: [
      { x: -154, y: -14, url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/19/267627/411077" },
      { x: 102, y: -14, url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/19/267627/411078" },
      { x: 358, y: -14, url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/19/267627/411079" },
      { x: 614, y: -14, url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/19/267627/411080" },
      { x: -154, y: 242, url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/19/267628/411077" },
      { x: 102, y: 242, url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/19/267628/411078" },
      { x: 358, y: 242, url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/19/267628/411079" },
      { x: 614, y: 242, url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/19/267628/411080" },
    ],
    polygon: [
      [294.3, 214.6],
      [284.9, 236.5],
      [307.5, 246.2],
      [296.2, 272.4],
      [335.2, 289.2],
      [351.3, 251.7],
      [335.9, 245.2],
      [349.1, 214.4],
      [327.1, 204.9],
      [318.5, 224.9],
    ],
    bbox: [274, 195, 87, 104],
    ridges: [[300, 218, 335, 275]],
    azimuth_vec: [318, 246, 320, 300],
    obstructions: [],
    pv_modules_550: Array.from({ length: 35 }).map((_, i) => {
      const r = Math.floor(i / 7);
      const c = i % 7;
      return {
        id: i + 1,
        x: Math.round(295 + c * 7.2 + r * 2.5),
        y: Math.round(222 + r * 12 + c * 1.5),
        w: 7,
        h: 5,
        string_id: 1,
      };
    }),
    pv_modules_440: Array.from({ length: 42 }).map((_, i) => {
      const r = Math.floor(i / 7);
      const c = i % 7;
      return {
        id: i + 1,
        x: Math.round(294 + c * 6.5 + r * 2.2),
        y: Math.round(220 + r * 10 + c * 1.3),
        w: 6,
        h: 4,
        string_id: 1,
      };
    }),
    specs: {
      550: spesifikasiDemo(simulasiRumah),
      440: { count: 104, kwp: 45.76, e_ac_kwh_yr1: 59600, savings_idr_yr1: 36154000 },
    },
    cv_logs: [
      { tahap: 1, waktu: "00:00.11", sub: "L1 Geodata", pesan: "Tile satelit koordinat [-3.7628, 102.2654] diambil. Footprint OSM 277,9 m²." },
      { tahap: 2, waktu: "00:00.98", sub: "L2 Heuristic", pesan: "Keyakinan CV rendah (0,34). Beralih ke fallback heuristik jejak bangunan OSM × 0,85." },
      { tahap: 3, waktu: "00:01.72", sub: "L2 Filter", pesan: "Tidak ada obstruksi atap mayor terdeteksi pada resolusi ini. Luas bersih: 236,2 m²." },
      { tahap: 4, waktu: "00:02.24", sub: "L2 PCA", pesan: "Sumbu memanjang dihitung dari koordinat simpul OSM. Azimut 174,2° (Selatan), tilt nominal 15°." },
      { tahap: 5, waktu: "00:02.94", sub: "L3 Layout", pesan: "Penataan 91 modul (50,05 kWp). Siap diteruskan ke kalkulasi tarif R-1/TR 2.200 VA." },
    ],
    peringatan:
      "Keyakinan CV rendah (0,34). Luas atap diperkirakan dari jejak bangunan OSM dikali 0,85. Batas atap dapat disesuaikan manual pada mode lanjutan.",
  },
];

export const TAHAP_INFO = [
  {
    nomor: 1,
    nama: "Akuisisi Citra",
    subjudul: "Tile Satelit Esri z=19 & Bounding Box OSM",
    penjelasan:
      "Sistem mengambil tile citra satelit resolusi tinggi (~0,298 m/px) dari Esri World Imagery pada koordinat centroid bangunan. Bounding box dan titik prompt diselaraskan dari basis data relasi OpenStreetMap.",
  },
  {
    nomor: 2,
    nama: "Segmentasi AI",
    subjudul: "Deteksi Kontur Atap via MobileSAM (ONNX)",
    penjelasan:
      "Model segmentasi zero-shot MobileSAM memindai citra dengan prompt centroid. Poligon kontur bidang atap dipisahkan secara otomatis dari kanopi pohon, jalan aspal, dan halaman sekitar.",
  },
  {
    nomor: 3,
    nama: "Filter Obstruksi",
    subjudul: "Penapisan Tandon Air, AC & Sempadan Keselamatan",
    penjelasan:
      "Sistem mendeteksi objek penghalang di atas atap (tandon air, kompresor AC outdoor, ventilasi, dan bayangan) serta menerapkan sempadan batas tepi 0,5 meter. Area ini dieksklusi dari bidang penempatan modul.",
  },
  {
    nomor: 4,
    nama: "Bubungan & Hadap",
    subjudul: "Deteksi Garis Ridge, Kemiringan (Tilt) & Azimut",
    penjelasan:
      "Algoritma Principal Component Analysis (PCA) mendeteksi sumbu utama bubungan atap. Vektor hadap azimut dan sudut kemiringan (tilt) dihitung untuk pemodelan transposisi POA pada lintang Bengkulu (-3,8° LS).",
  },
  {
    nomor: 5,
    nama: "Penataan Panel PV",
    subjudul: "Simulasi Grid Modul Surya & Kapasitas kWp",
    penjelasan:
      "Modul fotovoltaik monokristalin Tier-1 disusun secara otomatis pada bidang atap layak yang tersisa. Jumlah modul maksimum, kapasitas total kWp, dan estimasi produksi energi tahun pertama siap dialirkan ke mesin tekno-ekonomi L3–L5.",
  },
];
