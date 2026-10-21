"""Konfigurasi lingkungan engine untuk pengembangan dan VPS."""

import os
from urllib.parse import urlsplit


def asal_web() -> list[str]:
    asal = [
        p.strip().rstrip("/")
        for p in os.getenv(
            "PETASURYA_CORS_ORIGINS", "http://localhost:3000,http://127.0.0.1:3000"
        ).split(",")
        if p.strip()
    ]
    for p in asal:
        url = urlsplit(p)
        if (
            url.scheme not in {"http", "https"}
            or not url.netloc
            or url.path
            or url.query
            or url.fragment
            or url.username
            or url.password
        ):
            raise ValueError("PETASURYA_CORS_ORIGINS harus berisi origin HTTP(S), dipisahkan koma.")
    return asal


def thread_model() -> int:
    jumlah = int(os.getenv("PETASURYA_MODEL_THREADS", "2"))
    if not 1 <= jumlah <= 8:
        raise ValueError("PETASURYA_MODEL_THREADS harus berada pada rentang 1–8.")
    return jumlah
