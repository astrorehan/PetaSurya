from fastapi.testclient import TestClient

from app.main import VERSION, app

klien = TestClient(app)


def test_health_mengembalikan_versi():
    r = klien.get("/api/v1/health")
    assert r.status_code == 200
    assert r.json() == {"status": "ok", "engine_version": VERSION}
