"""Cache lokal geometri OSM dan hasil L2; citra tidak disimpan."""

import json
import os
import sqlite3
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]


def _path() -> Path:
    return Path(os.environ.get("PETASURYA_CACHE_DIR", ROOT / "data/cache")) / "hasil.sqlite3"


def simpan(jenis: str, identitas: int, data: dict) -> None:
    lokasi = _path()
    lokasi.parent.mkdir(parents=True, exist_ok=True)
    with sqlite3.connect(lokasi, timeout=10) as db:
        db.execute(
            "CREATE TABLE IF NOT EXISTS hasil "
            "(jenis TEXT, id INTEGER, data TEXT, PRIMARY KEY(jenis,id))"
        )
        db.execute(
            "INSERT OR REPLACE INTO hasil VALUES (?, ?, ?)",
            (jenis, identitas, json.dumps(data, ensure_ascii=False, allow_nan=False)),
        )


def baca(jenis: str, identitas: int | None = None) -> list[dict]:
    lokasi = _path()
    if not lokasi.exists():
        return []
    with sqlite3.connect(lokasi, timeout=10) as db:
        if identitas is None:
            rows = db.execute(
                "SELECT data FROM hasil WHERE jenis=? ORDER BY id", (jenis,)
            ).fetchall()
        else:
            rows = db.execute(
                "SELECT data FROM hasil WHERE jenis=? AND id=?", (jenis, identitas)
            ).fetchall()
    return [json.loads(row[0]) for row in rows]
