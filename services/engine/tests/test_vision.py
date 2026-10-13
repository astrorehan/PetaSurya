"""Georeferensi, penilaian mask, dan jalur mundur L2 tanpa unduhan jaringan."""

import numpy as np
import pytest
from shapely.geometry import Polygon, box, shape

from app.contracts import BangunanRingkas
from app.vision import (
    BingkaiCitra,
    analisis_dari_mask,
    azimut_sumbu,
    keyakinan,
    luas_geodesik,
    mask_ke_geometri,
    nilai_mask,
    pra_proses,
    segmentasi_atap,
)


@pytest.fixture
def bingkai():
    return BingkaiCitra.di_sekitar(102.2683, -3.7606, lebar=640, tinggi=480)


@pytest.fixture
def bangunan(bingkai):
    cincin = [
        bingkai.ke_lonlat(x, y)
        for x, y in [(260, 180), (380, 180), (380, 300), (260, 300), (260, 180)]
    ]
    geom = {"type": "Polygon", "coordinates": [cincin]}
    return BangunanRingkas(
        id=123,
        source="osm",
        source_ref="way/123",
        geom=geom,
        footprint_m2=luas_geodesik(shape(geom)),
        building_tag="yes",
    )


def test_bingkai_bolak_balik_dan_resolusi(bingkai):
    assert bingkai.ke_piksel(102.2683, -3.7606) == pytest.approx((320, 240))
    for x, y in [(0, 0), (640, 480), (123.4, 87.6)]:
        assert bingkai.ke_piksel(*bingkai.ke_lonlat(x, y)) == pytest.approx((x, y))
    assert bingkai.meter_per_piksel == pytest.approx(0.298, abs=0.001)


def test_pra_proses_rgb_normalisasi_dan_padding():
    citra = np.full((240, 480, 3), 128, dtype=np.uint8)
    tensor, skala = pra_proses(citra)
    assert tensor.shape == (1, 3, 1024, 1024)
    assert tensor.dtype == np.float32
    assert skala == pytest.approx((1024 / 480, 512 / 240))
    assert tensor[0, 0, 20, 20] == pytest.approx((128 - 123.675) / 58.395)
    assert np.count_nonzero(tensor[:, :, 512:]) == 0


def test_mask_ke_poligon_mempertahankan_lubang_dan_komponen():
    mask = np.zeros((80, 100), dtype=np.uint8)
    mask[10:50, 10:50] = 1
    mask[20:30, 20:30] = 0
    mask[60:70, 70:90] = 1
    geom = mask_ke_geometri(mask)
    assert geom.is_valid
    assert geom.area == pytest.approx(1700)
    assert not geom.covers(box(22, 22, 28, 28))
    assert len(geom.geoms) == 2


def test_iou_dihitung_sebelum_pemotongan():
    mask = np.zeros((100, 100), dtype=np.uint8)
    mask[10:90, 10:90] = 1
    skor = nilai_mask(mask, 0.9, box(30, 30, 70, 70))
    assert skor["iou_footprint"] == pytest.approx(0.25)
    assert skor["rasio_luas"] == pytest.approx(4)
    assert skor["confidence"] < 0.5


def test_keyakinan_adalah_heuristik_bukan_probabilitas_terkalibrasi():
    assert keyakinan(0.8, 0.6, 1.2) == pytest.approx(0.73)
    assert keyakinan(2, 1, 1) == 1
    assert keyakinan(0, 0, 8) == 0


def test_mask_kosong_tidak_disebut_cv(bingkai, bangunan):
    hasil, metrik = analisis_dari_mask(bangunan, bingkai, np.zeros((480, 640), dtype=np.uint8), 0.9)
    assert hasil.method == "footprint_fallback"
    assert hasil.mask_geojson is None
    assert hasil.confidence < 0.45
    assert hasil.peringatan
    assert metrik["iou_footprint"] == 0


def test_cv_mask_bersumber_dengan_luas_geodesik(bingkai, bangunan):
    mask = np.zeros((480, 640), dtype=np.uint8)
    mask[185:296, 265:376] = 1
    hasil, metrik = analisis_dari_mask(bangunan, bingkai, mask, 0.9)
    assert hasil.method == "cv"
    assert metrik["iou_footprint"] > 0.5
    assert hasil.roof_area_m2 > 1000
    assert hasil.roof_area_m2 < bangunan.footprint_m2
    assert hasil.usable_area_m2 == pytest.approx(round(hasil.roof_area_m2 * 0.85, 1), abs=0.2)
    assert hasil.tilt_deg == 15
    assert hasil.obstruction_frac == 0
    assert "asumsi" in hasil.catatan.lower()
    assert shape(hasil.mask_geojson.model_dump()).is_valid


def test_skor_sam_tinggi_tidak_menutupi_iou_rendah(bingkai, bangunan):
    mask = np.zeros((480, 640), dtype=np.uint8)
    mask[160:350, 240:470] = 1
    hasil, metrik = analisis_dari_mask(bangunan, bingkai, mask, 1.0)
    assert metrik["iou_footprint"] < 0.5
    assert hasil.method == "footprint_fallback"
    assert hasil.confidence < 0.45


def test_azimut_sumbu_persegi_panjang():
    assert azimut_sumbu(box(0, 0, 10, 50)) == pytest.approx(0)
    assert azimut_sumbu(box(0, 0, 50, 10)) == pytest.approx(90)
    miring = Polygon([(0, 0), (10, 10), (8, 12), (-2, 2)])
    assert azimut_sumbu(miring) == pytest.approx(135)


def test_luas_geodesik_mengikuti_lintang():
    ekuator = luas_geodesik(box(102, 0, 102.001, 0.001))
    kutub = luas_geodesik(box(102, 60, 102.001, 60.001))
    assert 0.49 < kutub / ekuator < 0.51


@pytest.mark.parametrize("dimensi_encoder", [3, 4])
def test_encoder_dan_decoder_memakai_ruang_koordinat_yang_sama(monkeypatch, dimensi_encoder):
    """Ekspor dengan pra-proses internal menerima RGB mentah; kotak tetap diskalakan."""
    from types import SimpleNamespace

    diterima = {}

    class Encoder:
        def get_inputs(self):
            bentuk = [100, 100, 3] if dimensi_encoder == 3 else [1, 3, 1024, 1024]
            return [SimpleNamespace(name="input_image", shape=bentuk)]

        def run(self, _, nilai):
            diterima["encoder"] = nilai["input_image"]
            return [np.zeros((1, 256, 64, 64), np.float32)]

    class Decoder:
        def run(self, _, nilai):
            diterima["decoder"] = nilai
            masks = np.full((1, 4, 100, 100), -1, np.float32)
            masks[0, 0, 10:90, 10:90] = 1
            masks[0, 1] = 1
            return masks, np.array([[0.8, 1, 0, 0]], np.float32), None

    monkeypatch.setattr("app.vision._sesi", lambda: (Encoder(), Decoder()))
    tile = np.full((100, 100, 3), 128, np.uint8)
    mask, skor = segmentasi_atap(tile, box(10, 10, 90, 90))
    assert skor == pytest.approx(0.8)
    assert mask.sum() == 6400
    assert diterima["encoder"].dtype == np.float32
    if dimensi_encoder == 3:
        np.testing.assert_array_equal(diterima["encoder"], tile)
    else:
        assert diterima["encoder"].shape == (1, 3, 1024, 1024)
        assert diterima["encoder"][0, 0, 20, 20] == pytest.approx((128 - 123.675) / 58.395)
    np.testing.assert_allclose(
        diterima["decoder"]["point_coords"], [[[512, 512], [102.4, 102.4], [921.6, 921.6]]]
    )
    np.testing.assert_array_equal(diterima["decoder"]["point_labels"], [[1, 2, 3]])
    np.testing.assert_array_equal(diterima["decoder"]["orig_im_size"], [100, 100])
