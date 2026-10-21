"""L2: analisis batch satu kawasan; model dan citra diganti tiruan."""

from types import SimpleNamespace

from app.buildings import PermintaanFootprintInput
from scripts.analisis_kawasan import CITRA_GAGAL, GAGAL_BERUNTUN, jalankan, pilih_bangunan

KAWASAN = {"barat": 102.2940, "selatan": -3.8120, "timur": 102.2985, "utara": -3.8075}


def hasil(metode: str = "cv", sumber: str = "esri-world-imagery"):
    return SimpleNamespace(
        method=SimpleNamespace(value=metode),
        imagery=SimpleNamespace(source=sumber),
        peringatan=None if sumber != CITRA_GAGAL else "Analisis citra tidak tersedia (timeout).",
    )


def bangunan(*ids: int):
    return [SimpleNamespace(id=i) for i in ids]


def test_pilih_hanya_perkiraan_rumah_terdekat_dan_dibatasi():
    area = PermintaanFootprintInput(**KAWASAN)
    rumah = pilih_bangunan(area, 500, semua_jenis=False)
    assert len(rumah) == 500
    assert all(b.perkiraan_jenis == "rumah" for b in rumah)
    semua = pilih_bangunan(area, 1000, semua_jenis=True)
    assert any(b.perkiraan_jenis is None for b in semua)
    # Urutan terdekat dari pusat dipertahankan setelah penyaringan.
    urutan = {b.id: i for i, b in enumerate(semua)}
    assert [urutan[b.id] for b in rumah] == sorted(urutan[b.id] for b in rumah)


def test_lewati_hasil_tersimpan_dan_ulang_hasil_yang_citranya_gagal():
    simpanan = {1: hasil(), 2: hasil("footprint_fallback", CITRA_GAGAL)}
    panggilan, jeda = [], []

    def analisis(i, force):
        panggilan.append((i, force))
        return hasil("footprint_fallback") if i == 4 else hasil()

    r = jalankan(bangunan(1, 2, 3, 4), 1.5, analisis, simpanan.get, jeda.append)
    assert panggilan == [(2, True), (3, False), (4, False)]
    assert (r["dilewati"], r["cv"], r["footprint_fallback"], r["citra_gagal"]) == (1, 2, 1, 0)
    assert jeda == [1.5, 1.5, 1.5]
    assert r["berhenti"] is None and r["kegagalan"] == []


def test_galat_satu_bangunan_dicatat_lalu_lanjut():
    def analisis(i, force):
        if i == 1:
            raise RuntimeError("model tidak termuat")
        return hasil()

    r = jalankan(bangunan(1, 2), 1.0, analisis, lambda i: None, lambda s: None)
    assert (r["galat"], r["cv"]) == (1, 1)
    assert r["kegagalan"] == [{"id": 1, "galat": "RuntimeError: model tidak termuat"}]


def test_berhenti_setelah_gagal_beruntun():
    panggilan = []

    def analisis(i, force):
        panggilan.append(i)
        return hasil("footprint_fallback", CITRA_GAGAL)

    r = jalankan(bangunan(*range(1, 10)), 1.0, analisis, lambda i: None, lambda s: None)
    assert panggilan == list(range(1, GAGAL_BERUNTUN + 1))
    assert r["citra_gagal"] == GAGAL_BERUNTUN
    assert r["berhenti"] == f"gagal {GAGAL_BERUNTUN}× beruntun"
    assert all(k["galat"].startswith("Analisis citra tidak tersedia") for k in r["kegagalan"])


def test_hitungan_beruntun_kembali_nol_setelah_berhasil():
    pola = ["gagal", "ok", "gagal", "gagal", "ok"]
    jawaban = iter(pola)

    def analisis(i, force):
        return hasil("footprint_fallback", CITRA_GAGAL) if next(jawaban) == "gagal" else hasil()

    r = jalankan(bangunan(*range(len(pola))), 1.0, analisis, lambda i: None, lambda s: None)
    assert r["berhenti"] is None
    assert (r["citra_gagal"], r["cv"]) == (3, 2)


def test_interupsi_menyimpan_ringkasan():
    def analisis(i, force):
        if i == 2:
            raise KeyboardInterrupt
        return hasil()

    r = jalankan(bangunan(1, 2, 3), 1.0, analisis, lambda i: None, lambda s: None)
    assert r["berhenti"] == "dihentikan pengguna"
    assert r["cv"] == 1 and r["dipilih"] == 3
