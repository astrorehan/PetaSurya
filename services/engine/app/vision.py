"""L2: segmentasi MobileSAM ONNX, georeferensi WGS84, dan penilaian mask."""

from __future__ import annotations

import math
from dataclasses import dataclass
from functools import lru_cache
from pathlib import Path

import cv2
import numpy as np
from PIL import Image
from pyproj import Geod
from shapely import transform
from shapely.affinity import translate
from shapely.geometry import MultiPolygon, Point, Polygon, box, mapping, shape
from shapely.geometry.polygon import orient
from shapely.ops import unary_union

from app.contracts import AnalisisAtap, BangunanRingkas
from app.settings import thread_model

MODEL_VERSION = "mobilesam-osm-v4"
DIR_MODEL = Path(__file__).resolve().parents[1] / "models"
GEOD = Geod(ellps="WGS84")
IOU_MIN = 0.65
SKOR_MIN = 0.45


@dataclass(frozen=True)
class BingkaiCitra:
    """Asal piksel global Web Mercator; x ke timur, y ke selatan."""

    x0: float
    y0: float
    lebar: int = 640
    tinggi: int = 480
    zoom: int = 19

    @classmethod
    def di_sekitar(cls, lon: float, lat: float, lebar=640, tinggi=480, zoom=19):
        n = 256 * 2**zoom
        x = (lon + 180) / 360 * n
        y = (1 - math.asinh(math.tan(math.radians(lat))) / math.pi) / 2 * n
        return cls(x - lebar / 2, y - tinggi / 2, lebar, tinggi, zoom)

    def ke_piksel(self, lon, lat):
        n = 256 * 2**self.zoom
        x = (np.asarray(lon) + 180) / 360 * n - self.x0
        y = (1 - np.arcsinh(np.tan(np.radians(lat))) / math.pi) / 2 * n - self.y0
        return x, y

    def ke_lonlat(self, x, y):
        n = 256 * 2**self.zoom
        lon = (np.asarray(x) + self.x0) / n * 360 - 180
        lat = np.degrees(np.arctan(np.sinh(math.pi * (1 - 2 * (np.asarray(y) + self.y0) / n))))
        return lon, lat

    @property
    def meter_per_piksel(self):
        _, lat = self.ke_lonlat(self.lebar / 2, self.tinggi / 2)
        return 2 * math.pi * 6378137 * math.cos(math.radians(lat)) / (256 * 2**self.zoom)


def luas_geodesik(geom) -> float:
    """Luas m² di ellipsoid WGS84; lubang dikurangkan, setiap komponen dijumlahkan."""
    bagian = [geom] if isinstance(geom, Polygon) else list(geom.geoms)
    return sum(abs(GEOD.geometry_area_perimeter(orient(p, sign=1))[0]) for p in bagian)


def mask_ke_geometri(mask: np.ndarray) -> MultiPolygon:
    """Gabungkan rentang piksel sebagai sel berluas 1; pertahankan lubang mask."""
    persegi = []
    for y, baris in enumerate(mask.astype(bool)):
        batas = np.flatnonzero(np.diff(np.r_[False, baris, False].astype(np.int8)))
        persegi.extend(box(int(x1), y, int(x2), y + 1) for x1, x2 in batas.reshape(-1, 2))
    geom = unary_union(persegi)
    if geom.is_empty:
        return MultiPolygon([])
    return MultiPolygon([geom]) if isinstance(geom, Polygon) else geom


def bersihkan_mask(mask: np.ndarray) -> np.ndarray:
    """Buang pulau di bawah 1% komponen utama; pertahankan lubang dan sayap besar."""
    jumlah, label, statistik, _ = cv2.connectedComponentsWithStats(
        mask.astype(np.uint8), connectivity=8
    )
    if jumlah <= 1:
        return np.zeros_like(mask, dtype=np.uint8)
    luas = statistik[1:, cv2.CC_STAT_AREA]
    dipakai = np.r_[False, luas >= max(4, luas.max() * 0.01)]
    return dipakai[label].astype(np.uint8)


def _mask_layak(metrik: dict[str, float]) -> bool:
    return metrik["confidence"] >= SKOR_MIN and metrik["iou_footprint"] >= IOU_MIN


def keyakinan(skor_sam: float, iou: float, rasio_luas: float) -> float:
    """Heuristik 0,45 SAM + 0,35 IoU + 0,20 kesesuaian luas; belum dikalibrasi."""
    if not all(math.isfinite(n) for n in [skor_sam, iou, rasio_luas]):
        return 0.0
    hukuman = max(0, 1 - abs(rasio_luas - 1))
    return float(np.clip(0.45 * skor_sam + 0.35 * iou + 0.20 * hukuman, 0, 1))


def nilai_mask(mask: np.ndarray, skor: float, footprint) -> dict[str, float]:
    """Ukur overlap dan rasio dari mask penuh, tanpa pemotongan ke footprint."""
    geom = mask_ke_geometri(mask)
    gabungan = geom.union(footprint).area
    iou = geom.intersection(footprint).area / gabungan if gabungan else 0.0
    rasio = geom.area / footprint.area if footprint.area else 0.0
    return {
        "sam_score": float(skor),
        "iou_footprint": iou,
        "rasio_luas": rasio,
        "confidence": keyakinan(skor, iou, rasio),
    }


def azimut_sumbu(geom) -> float:
    """Sumbu panjang minimum rotated rectangle, derajat dari utara modulo 180."""
    titik = list(geom.minimum_rotated_rectangle.exterior.coords)
    sisi = [(b[0] - a[0], b[1] - a[1]) for a, b in zip(titik[:-1], titik[1:], strict=True)]
    dx, dy = max(sisi, key=lambda p: p[0] ** 2 + p[1] ** 2)
    return round(math.degrees(math.atan2(dx, -dy)) % 180, 1)


def _resize_rgb(tile: np.ndarray) -> tuple[np.ndarray, tuple[float, float]]:
    """ResizeLongestSide SAM: bulatkan ukuran sebelum menskalakan koordinat."""
    h, w = tile.shape[:2]
    nh, nw = int(h * 1024 / max(h, w) + 0.5), int(w * 1024 / max(h, w) + 0.5)
    rgb = np.asarray(
        Image.fromarray(tile).resize((nw, nh), Image.Resampling.BILINEAR), dtype=np.float32
    )
    return rgb, (nw / w, nh / h)


def pra_proses(tile: np.ndarray) -> tuple[np.ndarray, tuple[float, float]]:
    """SAM: sisi terpanjang 1024, normalisasi RGB, padding nol setelah normalisasi."""
    rgb, skala = _resize_rgb(tile)
    nh, nw = rgb.shape[:2]
    rgb = (rgb - np.array([123.675, 116.28, 103.53], np.float32)) / np.array(
        [58.395, 57.12, 57.375], np.float32
    )
    tensor = np.zeros((1, 3, 1024, 1024), dtype=np.float32)
    tensor[0, :, :nh, :nw] = rgb.transpose(2, 0, 1)
    return tensor, skala


@lru_cache(maxsize=1)
def _sesi():
    """Muat encoder dan decoder sekali secara malas dengan dua thread CPU."""
    import onnxruntime as ort

    if not all(
        (DIR_MODEL / nama).is_file()
        for nama in ["mobilesam_encoder.onnx", "mobilesam_decoder.onnx"]
    ):
        raise FileNotFoundError("Bobot ONNX belum tersedia; jalankan scripts.unduh_model_vision.")
    opsi = ort.SessionOptions()
    opsi.intra_op_num_threads = thread_model()
    return tuple(
        ort.InferenceSession(str(DIR_MODEL / nama), opsi, providers=["CPUExecutionProvider"])
        for nama in ["mobilesam_encoder.onnx", "mobilesam_decoder.onnx"]
    )


def _inferensi(tile: np.ndarray, footprint, *, perkuat=False) -> tuple[np.ndarray, float]:
    """Kotak OSM dan centroid positif; pilih mask dengan tiga sinyal kesesuaian."""
    enc, dec = _sesi()
    rgb, skala = _resize_rgb(tile)
    pusat = footprint.centroid
    if not footprint.covers(pusat):
        pusat = footprint.representative_point()
    xmin, ymin, xmax, ymax = footprint.bounds
    koordinat = [[pusat.x, pusat.y], [xmin, ymin], [xmax, ymax]]
    label = [1, 2, 3]
    if perkuat:
        # Titik interior tersebar membantu sayap atap; titik negatif berada jauh
        # di luar footprint agar tidak memaksa overhang mengikuti garis OSM.
        calon = [
            Point(x, y)
            for x in np.linspace(xmin, xmax, 7)[1:-1]
            for y in np.linspace(ymin, ymax, 7)[1:-1]
            if footprint.contains(Point(x, y))
        ]
        terpilih = [pusat]
        for _ in range(min(3, len(calon))):
            p = max(calon, key=lambda c: min(c.distance(t) for t in terpilih))
            terpilih.append(p)
            calon.remove(p)
            koordinat.append([p.x, p.y])
            label.append(1)
        jarak = max(8, max(xmax - xmin, ymax - ymin) * 0.15)
        h, w = tile.shape[:2]
        for x, y in [
            (xmin - jarak, ymin - jarak),
            (xmax + jarak, ymin - jarak),
            (xmin - jarak, ymax + jarak),
            (xmax + jarak, ymax + jarak),
        ]:
            if 0 <= x < w and 0 <= y < h:
                koordinat.append([x, y])
                label.append(0)
    titik = np.array([koordinat], np.float32)
    titik *= np.array(skala, np.float32)
    masukan = enc.get_inputs()[0]
    # Ekspor Acly hanya menormalisasi dan memberi padding, tanpa resize.
    # RGB dan titik harus berada pada skala 1024 yang sama sebelum encoder/decoder.
    citra_encoder = rgb if len(masukan.shape) == 3 else pra_proses(tile)[0]
    emb = enc.run(None, {masukan.name: citra_encoder})[0]
    masks, skor, _ = dec.run(
        None,
        {
            "image_embeddings": emb,
            "point_coords": titik,
            "point_labels": np.array([label], np.float32),
            "mask_input": np.zeros((1, 1, 256, 256), np.float32),
            "has_mask_input": np.zeros(1, np.float32),
            "orig_im_size": np.array(tile.shape[:2], np.float32),
        },
    )
    pilihan = []
    for prediksi, nilai in zip(masks[0], skor[0], strict=True):
        mask = (prediksi > 0).astype(np.uint8)
        mask = cv2.morphologyEx(mask, cv2.MORPH_CLOSE, np.ones((3, 3), np.uint8))
        pilihan.append((nilai_mask(mask, float(nilai), footprint)["confidence"], mask, nilai))
    _, mask, nilai = max(pilihan, key=lambda p: p[0])
    return bersihkan_mask(mask), float(nilai)


def segmentasi_atap(tile: np.ndarray, footprint, *, perkuat=False) -> tuple[np.ndarray, float]:
    """Baca ROI atap dengan konteks 25%; pulihkan kanvas saat ROI kurang konsisten."""
    h, w = tile.shape[:2]
    xmin, ymin, xmax, ymax = footprint.bounds
    konteks = max(16, max(xmax - xmin, ymax - ymin) * 0.25)
    x0, y0 = max(0, math.floor(xmin - konteks)), max(0, math.floor(ymin - konteks))
    x1, y1 = min(w, math.ceil(xmax + konteks)), min(h, math.ceil(ymax + konteks))
    if x1 <= x0 or y1 <= y0:
        raise ValueError("Batas bangunan berada di luar citra.")
    lokal = translate(footprint, xoff=-x0, yoff=-y0)
    opsi = {"perkuat": True} if perkuat else {}
    potongan, skor = _inferensi(tile[y0:y1, x0:x1], lokal, **opsi)
    mask = np.zeros((h, w), np.uint8)
    mask[y0:y1, x0:x1] = potongan
    metrik = nilai_mask(mask, skor, footprint)
    if _mask_layak(metrik) or (x0, y0, x1, y1) == (0, 0, w, h):
        return mask, skor
    mask_penuh, skor_penuh = _inferensi(tile, footprint, **opsi)
    metrik_penuh = nilai_mask(mask_penuh, skor_penuh, footprint)
    if _mask_layak(metrik_penuh) or metrik_penuh["iou_footprint"] > metrik["iou_footprint"]:
        return mask_penuh, skor_penuh
    return mask, skor


def analisis_dari_mask(
    bangunan: BangunanRingkas, bingkai: BingkaiCitra, mask: np.ndarray, skor: float
) -> tuple[AnalisisAtap, dict[str, float]]:
    """Luas mask WGS84; tilt 15° dan cadangan area 15% tetap asumsi eksplisit."""
    footprint = transform(shape(bangunan.geom.model_dump()), bingkai.ke_piksel, interleaved=False)
    metrik = nilai_mask(mask, skor, footprint)
    # Footprint memandu/penguji konsistensi, bukan pemotong overhang atap.
    geom = mask_ke_geometri(mask)
    valid = _mask_layak(metrik) and not geom.is_empty
    mask_geojson = None
    if valid:
        geom = geom.simplify(0.5, preserve_topology=True)
        geom = MultiPolygon([geom]) if isinstance(geom, Polygon) else geom
        geo = transform(geom, bingkai.ke_lonlat, interleaved=False)
        mask_geojson = mapping(geo)
        luas = luas_geodesik(geo)
        confidence = metrik["confidence"]
    else:
        luas = bangunan.footprint_m2 * 0.85
        confidence = min(metrik["confidence"], 0.44)
    azimut = azimut_sumbu(geom if valid else footprint)
    catatan = (
        "Tilt 15° dan cadangan area 15% adalah asumsi; obstruksi belum diukur. "
        "Azimut adalah sumbu panjang modulo 180°, bukan arah hadap bidang atap. "
        "Skor keyakinan merupakan heuristik yang belum dikalibrasi terhadap anotasi."
    )
    data = {
        "roof_analysis_id": bangunan.id,
        "building_id": bangunan.id,
        "roof_area_m2": round(luas, 1),
        "usable_area_m2": round(luas * 0.85, 1),
        "obstruction_frac": 0.0,
        "tilt_deg": 15.0,
        "azimuth_deg": azimut,
        "roof_type": "kompleks",
        "confidence": round(confidence, 4),
        "method": "cv" if valid else "footprint_fallback",
        "model_version": MODEL_VERSION,
        "imagery": {"source": "esri-world-imagery", "date": None},
        "mask_geojson": mask_geojson,
        "catatan": catatan,
    }
    if not valid:
        data["peringatan"] = (
            "Mask kurang sesuai dengan batas OSM. Luas diperkirakan dari footprint × 0,85; "
            "periksa batas atap sebelum merencanakan pemasangan."
        )
    return AnalisisAtap.model_validate(data), metrik
