"""Unduh bobot ONNX yang versinya dipatok, lalu periksa ukuran dan SHA-256."""

import hashlib
import json
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
from urllib.request import Request, urlopen

DIR_MODEL = Path(__file__).resolve().parents[1] / "models"


def unduh(berkas: dict, metadata: dict) -> None:
    tujuan = DIR_MODEL / berkas["local"]
    if tujuan.exists():
        with tujuan.open("rb") as isi:
            valid = hashlib.file_digest(isi, "sha256").hexdigest() == berkas["sha256"]
        if valid:
            print(f"Sudah valid: {tujuan.name}")
            return
    url = f"{metadata['repository']}/resolve/{metadata['revision']}/{berkas['remote']}"
    sementara = tujuan.with_suffix(".part")
    try:
        with urlopen(Request(url, headers={"User-Agent": "PetaSurya/0.1"}), timeout=60) as respons:
            with sementara.open("wb") as keluaran:
                while blok := respons.read(1024 * 1024):
                    keluaran.write(blok)
        with sementara.open("rb") as isi:
            digest = hashlib.file_digest(isi, "sha256").hexdigest()
        if sementara.stat().st_size != berkas["bytes"] or digest != berkas["sha256"]:
            raise ValueError(f"Bobot {berkas['local']} tidak cocok dengan manifest.")
        sementara.replace(tujuan)
        print(f"Terverifikasi: {tujuan.name} ({berkas['bytes']} byte)")
    finally:
        sementara.unlink(missing_ok=True)


if __name__ == "__main__":
    metadata = json.loads((DIR_MODEL / "mobilesam.json").read_text(encoding="utf-8"))
    with ThreadPoolExecutor(max_workers=2) as pekerja:
        list(pekerja.map(lambda berkas: unduh(berkas, metadata), metadata["files"]))
