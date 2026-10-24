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


def simpan_banyak(jenis: str, data: dict[int, dict]) -> None:
    """Tulis banyak baris dalam satu transaksi (satu koneksi, bukan satu per baris)."""
    if not data:
        return
    lokasi = _path()
    lokasi.parent.mkdir(parents=True, exist_ok=True)
    with sqlite3.connect(lokasi, timeout=10) as db:
        db.execute(
            "CREATE TABLE IF NOT EXISTS hasil "
            "(jenis TEXT, id INTEGER, data TEXT, PRIMARY KEY(jenis,id))"
        )
        db.executemany(
            "INSERT OR REPLACE INTO hasil VALUES (?, ?, ?)",
            [
                (jenis, identitas, json.dumps(isi, ensure_ascii=False, allow_nan=False))
                for identitas, isi in data.items()
            ],
        )


def baca_banyak(jenis: str, identitas: list[int]) -> dict[int, dict]:
    """Baris yang ada untuk daftar ID; ID yang tidak tersimpan tidak muncul."""
    lokasi = _path()
    if not lokasi.exists() or not identitas:
        return {}
    hasil: dict[int, dict] = {}
    with sqlite3.connect(lokasi, timeout=10) as db:
        for i in range(0, len(identitas), 500):  # batas variabel SQLite 999
            potong = identitas[i : i + 500]
            tanda = ",".join("?" * len(potong))
            baris = db.execute(
                f"SELECT id, data FROM hasil WHERE jenis=? AND id IN ({tanda})", (jenis, *potong)
            ).fetchall()
            hasil.update({row[0]: json.loads(row[1]) for row in baris})
    return hasil
