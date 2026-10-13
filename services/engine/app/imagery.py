"""Citra L2: mosaik Esri dalam memori atau citra lokal dengan georeferensi."""

import io
import json
import math
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
from urllib.request import Request, urlopen

import numpy as np
from PIL import Image
from shapely.geometry import shape

from app.contracts import BangunanRingkas
from app.vision import BingkaiCitra

DIR_TILE = Path(__file__).resolve().parents[3] / "data" / "tiles"
URL_TILE = "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile"


def bingkai_bangunan(bangunan: BangunanRingkas) -> BingkaiCitra:
    """Kanvas 640×480 z=19 berpusat pada centroid geometri OSM."""
    pusat = shape(bangunan.geom.model_dump()).centroid
    return BingkaiCitra.di_sekitar(pusat.x, pusat.y)


def daftar_tile(bingkai: BingkaiCitra) -> list[dict]:
    """Tile 256 px yang mencakup kanvas, termasuk sebagian tile di tepi."""
    return [
        {
            "x": 256 * x - bingkai.x0,
            "y": 256 * y - bingkai.y0,
            "url": f"{URL_TILE}/{bingkai.zoom}/{y}/{x}",
        }
        for y in range(math.floor(bingkai.y0 / 256), math.ceil((bingkai.y0 + bingkai.tinggi) / 256))
        for x in range(math.floor(bingkai.x0 / 256), math.ceil((bingkai.x0 + bingkai.lebar) / 256))
    ]


def ambil_citra(bingkai: BingkaiCitra) -> np.ndarray:
    """Ambil satu mosaik terbatas; tile tidak ditulis ke disk atau didistribusikan."""
    tiles = daftar_tile(bingkai)

    def unduh(tile):
        request = Request(tile["url"], headers={"User-Agent": "PetaSurya/0.1"})
        with urlopen(request, timeout=10) as respons:
            return Image.open(io.BytesIO(respons.read())).convert("RGB")

    with ThreadPoolExecutor(max_workers=4) as pekerja:
        gambar = list(pekerja.map(unduh, tiles))
    x0 = min(t["x"] for t in tiles)
    y0 = min(t["y"] for t in tiles)
    lebar = int(max(t["x"] for t in tiles) - x0) + 256
    tinggi = int(max(t["y"] for t in tiles) - y0) + 256
    mosaik = Image.new("RGB", (lebar, tinggi))
    for tile, citra in zip(tiles, gambar, strict=True):
        mosaik.paste(citra, (round(tile["x"] - x0), round(tile["y"] - y0)))
    citra = mosaik.transform(
        (bingkai.lebar, bingkai.tinggi),
        Image.Transform.AFFINE,
        (1, 0, -x0, 0, 1, -y0),
        Image.Resampling.BILINEAR,
    )
    return np.asarray(citra)


def muat_citra_lokal(building_id: int):
    """Baca citra yang disediakan pemilik data; sidecar berisi BingkaiCitra dan sumber."""
    metadata = DIR_TILE / f"{building_id}.json"
    citra = DIR_TILE / f"{building_id}.png"
    if not metadata.exists() or not citra.exists():
        return None
    data = json.loads(metadata.read_text(encoding="utf-8"))
    bingkai = BingkaiCitra(**data["bingkai"])
    rgb = np.asarray(Image.open(citra).convert("RGB"))
    if rgb.shape[:2] != (bingkai.tinggi, bingkai.lebar):
        raise ValueError("Ukuran citra lokal tidak sesuai georeferensi.")
    return bingkai, rgb, data["source"]
