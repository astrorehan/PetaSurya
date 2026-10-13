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
from shapely.geometry import MultiPolygon, Polygon, box, mapping, shape
from shapely.geometry.polygon import orient
from shapely.ops import unary_union

from app.contracts import AnalisisAtap, BangunanRingkas

MODEL_VERSION = "mobilesam-osmprompt-v3"
DIR_MODEL = Path(__file__).resolve().parents[1] / "models"
GEOD = Geod(ellps="WGS84")


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


def keyakinan(skor_sam: float, iou: float, rasio_luas: float) -> float:
    """Heuristik 0,45 SAM + 0,35 IoU + 0,20 kesesuaian luas; belum dikalibrasi."""
    if not all(math.isfinite(n) for n in [skor_sam, iou, rasio_luas]):
        return 0.0
    hukuman = max(0, 1 - abs(rasio_luas - 1))
    return float(np.clip(0.45 * skor_sam + 0.35 * iou + 0.20 * hukuman, 0, 1))


def nilai_mask(mask: np.ndarray, skor: float, footprint) -> dict[str, float]:
    """IoU dan rasio luas sebelum pemotongan supaya skor tidak naik secara artifisial."""
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


def pra_proses(tile: np.ndarray) -> tuple[np.ndarray, tuple[float, float]]:
    """SAM: sisi terpanjang 1024, normalisasi RGB, padding nol setelah normalisasi."""
    h, w = tile.shape[:2]
    nh, nw = round(h * 1024 / max(h, w)), round(w * 1024 / max(h, w))
    rgb = np.asarray(
        Image.fromarray(tile).resize((nw, nh), Image.Resampling.BILINEAR), dtype=np.float32
    )
    rgb = (rgb - np.array([123.675, 116.28, 103.53], np.float32)) / np.array(
        [58.395, 57.12, 57.375], np.float32
    )
    tensor = np.zeros((1, 3, 1024, 1024), dtype=np.float32)
    tensor[0, :, :nh, :nw] = rgb.transpose(2, 0, 1)
    return tensor, (nw / w, nh / h)


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
    opsi.intra_op_num_threads = 2
    return tuple(
        ort.InferenceSession(str(DIR_MODEL / nama), opsi, providers=["CPUExecutionProvider"])
        for nama in ["mobilesam_encoder.onnx", "mobilesam_decoder.onnx"]
    )


def segmentasi_atap(tile: np.ndarray, footprint) -> tuple[np.ndarray, float]:
    """Kotak OSM dan centroid positif; pilih mask dengan tiga sinyal kesesuaian."""
    enc, dec = _sesi()
    tensor, skala = pra_proses(tile)
    pusat = footprint.centroid
    if not footprint.covers(pusat):
        pusat = footprint.representative_point()
    xmin, ymin, xmax, ymax = footprint.bounds
    titik = np.array([[[pusat.x, pusat.y], [xmin, ymin], [xmax, ymax]]], np.float32)
    titik *= np.array(skala, np.float32)
    masukan = enc.get_inputs()[0]
    # Ekspor Acly menyertakan resize/normalisasi; jangan menerapkannya dua kali.
    citra_encoder = tile.astype(np.float32) if len(masukan.shape) == 3 else tensor
    emb = enc.run(None, {masukan.name: citra_encoder})[0]
    masks, skor, _ = dec.run(
        None,
        {
            "image_embeddings": emb,
            "point_coords": titik,
            "point_labels": np.array([[1, 2, 3]], np.float32),
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
    return mask, float(nilai)


def analisis_dari_mask(
    bangunan: BangunanRingkas, bingkai: BingkaiCitra, mask: np.ndarray, skor: float
) -> tuple[AnalisisAtap, dict[str, float]]:
    """Luas mask WGS84; tilt 15° dan cadangan area 15% tetap asumsi eksplisit."""
    footprint = transform(shape(bangunan.geom.model_dump()), bingkai.ke_piksel, interleaved=False)
    metrik = nilai_mask(mask, skor, footprint)
    geom = mask_ke_geometri(mask).intersection(footprint)
    valid = metrik["confidence"] >= 0.45 and metrik["iou_footprint"] > 0.5 and not geom.is_empty
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
