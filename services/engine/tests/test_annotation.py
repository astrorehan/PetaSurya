from concurrent.futures import ThreadPoolExecutor

from fastapi.testclient import TestClient

from scripts import anotasi_atap as meja


def test_simpan_bersamaan_tidak_menghilangkan_acuan(tmp_path, monkeypatch):
    monkeypatch.setattr(meja, "DIR_EVALUASI", tmp_path)
    monkeypatch.setattr(meja, "manifest", lambda: {"sampel": []})
    monkeypatch.setattr(meja, "sampel", lambda identitas: {"id": identitas})
    monkeypatch.setattr(meja, "citra", lambda identitas: (b"gambar", "sha-citra"))
    klien = TestClient(meja.app)

    def simpan(identitas):
        return klien.post(
            f"/acuan/{identitas}", json={"status": "ambigu", "catatan": "Tertutup pohon"}
        ).status_code

    with ThreadPoolExecutor(max_workers=6) as pool:
        assert list(pool.map(simpan, range(12))) == [200] * 12
    assert len(meja.anotasi()["sampel"]) == 12
    assert all(a["review"] == "belum" for a in meja.anotasi()["sampel"].values())


def test_meja_lokal_menolak_asal_lain(tmp_path, monkeypatch):
    monkeypatch.setattr(meja, "DIR_EVALUASI", tmp_path)
    r = TestClient(meja.app).post(
        "/acuan/1",
        headers={"origin": "https://situs-lain.example"},
        json={"status": "ambigu", "catatan": "x"},
    )
    assert r.status_code == 403
