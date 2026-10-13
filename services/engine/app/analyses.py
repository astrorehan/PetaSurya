"""Hasil L2 terbaru dalam memori, dibatasi 64 bangunan per proses."""

from collections import OrderedDict
from threading import Lock

from app.contracts import AnalisisAtap

_hasil: OrderedDict[int, AnalisisAtap] = OrderedDict()
_kunci = Lock()


def simpan_analisis(analisis: AnalisisAtap) -> None:
    with _kunci:
        _hasil[analisis.building_id] = analisis
        _hasil.move_to_end(analisis.building_id)
        while len(_hasil) > 64:
            _hasil.popitem(last=False)


def analisis_bangunan_terbaru(building_id: int) -> AnalisisAtap | None:
    with _kunci:
        return _hasil.get(building_id)


def analisis_terbaru(roof_analysis_id: int) -> AnalisisAtap | None:
    with _kunci:
        return next((a for a in _hasil.values() if a.roof_analysis_id == roof_analysis_id), None)
