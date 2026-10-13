"""Hasil L2 dalam cache lokal; 64 hasil terbaru juga tersedia dalam memori."""

from collections import OrderedDict
from threading import Lock

from app.contracts import AnalisisAtap
from app.storage import baca, simpan
from app.vision import MODEL_VERSION

_hasil: OrderedDict[int, AnalisisAtap] = OrderedDict()
_kunci = Lock()


def simpan_analisis(analisis: AnalisisAtap) -> None:
    simpan("analisis", analisis.building_id, analisis.model_dump(mode="json", exclude_unset=True))
    with _kunci:
        _hasil[analisis.building_id] = analisis
        _hasil.move_to_end(analisis.building_id)
        while len(_hasil) > 64:
            _hasil.popitem(last=False)


def analisis_bangunan_terbaru(building_id: int) -> AnalisisAtap | None:
    with _kunci:
        hasil = _hasil.get(building_id)
    if hasil and hasil.model_version == MODEL_VERSION:
        return hasil
    data = baca("analisis", building_id)
    if data and data[0].get("model_version") == MODEL_VERSION:
        return AnalisisAtap.model_validate(data[0])
    return None


def analisis_terbaru(roof_analysis_id: int) -> AnalisisAtap | None:
    with _kunci:
        hasil = next((a for a in _hasil.values() if a.roof_analysis_id == roof_analysis_id), None)
    if hasil and hasil.model_version == MODEL_VERSION:
        return hasil
    return next(
        (
            AnalisisAtap.model_validate(d)
            for d in baca("analisis")
            if d["roof_analysis_id"] == roof_analysis_id and d["model_version"] == MODEL_VERSION
        ),
        None,
    )
