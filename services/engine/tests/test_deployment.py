import pytest
from fastapi.testclient import TestClient

from app.geodata import MesinSibuk
from app.main import app
from app.settings import asal_web, thread_model


def test_ready_tidak_mengaku_siap_saat_bobot_gagal_dimuat(monkeypatch):
    def gagal():
        raise FileNotFoundError("bobot hilang")

    monkeypatch.setattr("app.main._sesi", gagal)
    klien = TestClient(app)
    assert klien.get("/api/v1/health").status_code == 200
    assert klien.get("/api/v1/ready").status_code == 503
    monkeypatch.setattr("app.main._sesi", lambda: (object(), object()))
    assert klien.get("/api/v1/ready").json()["provider"] == "CPUExecutionProvider"


def test_antrean_penuh_mengembalikan_pesan_yang_bisa_dicoba_ulang(monkeypatch):
    def sibuk(*args, **kwargs):
        raise MesinSibuk("Mesin sibuk")

    monkeypatch.setattr("app.main.proses_analisis_atap", sibuk)
    r = TestClient(app).post("/api/v1/analyze", json={"building_id": 123, "force": True})
    assert r.status_code == 503
    assert r.headers["retry-after"] == "10"
    assert r.json()["error"]["retriable"] is True


def test_origin_vps_eksplisit_dan_thread_dibatasi(monkeypatch):
    monkeypatch.setenv("PETASURYA_CORS_ORIGINS", "https://petasurya.example/,http://localhost:3000")
    assert asal_web() == ["https://petasurya.example", "http://localhost:3000"]
    for nilai in ["*", "https://a.example/path", "https://user:pass@a.example"]:
        monkeypatch.setenv("PETASURYA_CORS_ORIGINS", nilai)
        with pytest.raises(ValueError):
            asal_web()
    monkeypatch.setenv("PETASURYA_MODEL_THREADS", "0")
    with pytest.raises(ValueError):
        thread_model()
