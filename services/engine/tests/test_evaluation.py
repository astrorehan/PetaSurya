import json
from copy import deepcopy

import pytest
from shapely.geometry import box, mapping

from app.evaluation import (
    DIR_EVALUASI,
    acuan_piksel,
    buat_laporan,
    digest,
    metrik_geometri,
    ringkas,
)
from app.vision import BingkaiCitra


def test_metrik_membedakan_kesalahan_kontur_dan_luas():
    acuan = box(102, -3.8, 102.001, -3.799)
    bergeser = box(102.0005, -3.8, 102.0015, -3.799)
    m = metrik_geometri(bergeser, acuan)
    assert m["iou"] == pytest.approx(1 / 3, abs=0.0001)
    assert m["dice"] == pytest.approx(0.5, abs=0.0001)
    assert m["galat_luas_persen"] < 0.001
    assert metrik_geometri(None, acuan)["iou"] == 0


def test_acuan_menolak_poligon_silang_nonfinite_dan_di_luar_citra():
    f = BingkaiCitra.di_sekitar(102, -3.8)
    for ring in [
        [[0, 0], [20, 20], [0, 20], [20, 0]],
        [[0, 0], [800, 0], [0, 20]],
        [[0, 0], [float("nan"), 0], [0, 20]],
    ]:
        with pytest.raises(ValueError):
            acuan_piksel([[ring]], f)


def test_semua_kegagalan_masuk_penyebut():
    m = {"iou": 0.8, "galat_luas_persen": 10}
    data = [
        {"metrik": m, "method": "cv", "durasi_detik": 1},
        {
            "metrik": {"iou": 0.2, "galat_luas_persen": 60},
            "method": "footprint_fallback",
            "durasi_detik": 2,
        },
        {"metrik": None, "status_acuan": "ambigu", "galat": "sumber gagal"},
    ]
    r = ringkas(data)
    assert r["jumlah_sampel"] == 3
    assert r["berlabel"] == 2
    assert r["semua"]["mean_iou"] == pytest.approx(0.5)
    assert r["cv"]["mean_iou"] == 0.8
    assert r["fallback"] == r["ambigu"] == r["gagal_sumber"] == 1


def test_laporan_memeriksa_hash_citra_dan_membedakan_luas_fallback():
    f = BingkaiCitra.di_sekitar(102, -3.8)
    from dataclasses import asdict

    a = acuan_piksel([[[[100, 100], [200, 100], [200, 200], [100, 200]]]], f)
    m = {
        "versi": "uji",
        "sampel": [
            {
                "id": 1,
                "split": "uji",
                "strata": "kecil",
                "bingkai": asdict(f),
                "bangunan": {"geom": mapping(a)},
            }
        ],
    }
    anotasi = {
        "sha256_manifest": digest(m),
        "sampel": {
            "1": {
                "status": "digambar",
                "rings": [[[[100, 100], [200, 100], [200, 200], [100, 200]]]],
                "sha256_citra": "sama",
            }
        },
    }
    from app.vision import luas_geodesik

    p = {
        "model_version": "uji",
        "sha256_manifest": digest(m),
        "sha256_implementasi": "versi",
        "sampel": {
            "1": {
                "sha256_citra": "sama",
                "raw_mask": mapping(a),
                "analisis": {
                    "method": "footprint_fallback",
                    "roof_area_m2": luas_geodesik(a) * 0.85,
                },
            }
        },
    }
    r = buat_laporan(m, anotasi, p)["sampel"][0]
    assert r["metrik"]["iou"] == pytest.approx(1)
    assert r["metrik"]["galat_luas_persen"] == pytest.approx(15)
    beda = deepcopy(p)
    beda["sampel"]["1"]["sha256_citra"] = "beda"
    with pytest.raises(ValueError, match="Citra berubah"):
        buat_laporan(m, anotasi, beda)
    with pytest.raises(ValueError, match="Manifest berubah"):
        buat_laporan({**m, "versi": "baru"}, anotasi, p)


def test_sampel_dibekukan_sebelum_pengujian_dan_tidak_memakai_demo():
    m = json.loads((DIR_EVALUASI / "manifest.json").read_text("utf-8"))
    sampel = m["sampel"]
    assert len({s["id"] for s in sampel}) == 30
    assert sum(s["split"] == "uji" for s in sampel) == 10
    assert sum(s["split"] == "pengembangan" for s in sampel) == 20
    assert all(
        sum(s["strata"] == ukuran for s in sampel) == 10 for ukuran in ["kecil", "sedang", "besar"]
    )
    demo = json.loads((DIR_EVALUASI.parent / "fixtures/demo.json").read_text("utf-8"))
    assert not {s["id"] for s in sampel}.intersection(d["bangunan"]["id"] for d in demo)
