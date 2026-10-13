"""Katalog awal dari cuplikan OSM nyata; hasil analisis tidak dibuat."""

import json

from app.buildings import FIXTURE, _awal, batas_kota


def buat_katalog():
    data = {
        "_sumber": {
            "penerbit": "OpenStreetMap contributors (ODbL 1.0)",
            "url": "https://api.openstreetmap.org/api/0.6/map?bbox=102.265,-3.763,102.270,-3.758",
            "diambil": "2026-10-13",
            "batas_kota_bbox": list(batas_kota().bounds),
            "mentah": "bangunan/mentah/osm-unib-20261013.osm",
            "catatan": (
                "Seluruh way bangunan berupa poligon tertutup yang valid, "
                "ditambah sembilan contoh awal. Luas geodesik; nama tidak tersedia "
                "tetap null. Analisis tidak dibuat oleh katalog ini."
            ),
        },
        "bangunan": [
            b.model_dump(mode="json", exclude_unset=True)
            for b in sorted(_awal(), key=lambda b: b.id)
        ],
    }
    (FIXTURE / "katalog-bangunan.json").write_text(
        json.dumps(data, indent=2, ensure_ascii=False) + "\n", encoding="utf-8", newline="\n"
    )
    print(f"Katalog: {len(data['bangunan'])} bangunan nyata.")


if __name__ == "__main__":
    buat_katalog()
