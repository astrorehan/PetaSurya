"""Setiap fixture di data/fixtures harus lolos model pydantic hasil generate.

Padanannya di sisi TypeScript: packages/contracts/src/fixture.test.ts atas
berkas yang sama. Kalau salah satu merah setelah `pnpm gen:contracts`,
kontrak dua bahasa sudah tidak sinkron.
"""

from __future__ import annotations

import json
from pathlib import Path

import pytest
from pydantic import BaseModel, ValidationError

from app.contracts import AnalisisAtap, BangunanRingkas, GalatApi, HasilSimulasi, ParameterFisika

DIR_FIXTURE = Path(__file__).resolve().parents[3] / "data" / "fixtures"

KASUS: list[tuple[str, type[BaseModel], int]] = [
    ("bangunan", BangunanRingkas, 3),
    ("analisis", AnalisisAtap, 2),
    ("simulasi", HasilSimulasi, 1),
    ("parameter", ParameterFisika, 1),
]


def _berkas(sub: str) -> list[Path]:
    return sorted((DIR_FIXTURE / sub).glob("*.json"))


@pytest.mark.parametrize(("sub", "_model", "minimal"), KASUS)
def test_jumlah_fixture(sub: str, _model: type[BaseModel], minimal: int) -> None:
    assert len(_berkas(sub)) >= minimal


@pytest.mark.parametrize(
    ("berkas", "model"),
    [(b, model) for sub, model, _ in KASUS for b in _berkas(sub)],
    ids=lambda x: x.name if isinstance(x, Path) else x.__name__,
)
def test_fixture_lolos_pydantic(berkas: Path, model: type[BaseModel]) -> None:
    model.model_validate(json.loads(berkas.read_text(encoding="utf-8")))


def test_analisis_dua_jalur() -> None:
    hasil = [
        AnalisisAtap.model_validate(json.loads(b.read_text(encoding="utf-8")))
        for b in _berkas("analisis")
    ]
    metode = {a.method.value: a for a in hasil}
    assert metode["cv"].mask_geojson is not None
    assert metode["footprint_fallback"].mask_geojson is None
    assert metode["footprint_fallback"].peringatan
    assert metode["footprint_fallback"].confidence < 0.45


def test_simulasi_berlabel_contoh() -> None:
    for b in _berkas("simulasi"):
        assert json.loads(b.read_text(encoding="utf-8"))["_catatan"].startswith(
            "contoh dari cetak biru"
        )


def test_galat_menolak_kode_asing() -> None:
    GalatApi.model_validate(
        {"error": {"code": "ROOF_TOO_SMALL", "message": "Luas layak < 1 modul", "retriable": False}}
    )
    with pytest.raises(ValidationError):
        GalatApi.model_validate({"error": {"code": "APA_INI", "message": "x", "retriable": False}})


def test_monthly_kwh_harus_12() -> None:
    contoh = json.loads(_berkas("simulasi")[0].read_text(encoding="utf-8"))
    with pytest.raises(ValidationError):
        HasilSimulasi.model_validate({**contoh, "monthly_kwh": [1, 2, 3]})
    HasilSimulasi.model_validate({**contoh, "payback_years": None, "irr": None})
