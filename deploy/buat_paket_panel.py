"""Bentuk ZIP engine dengan whitelist source, data runtime dan bobot terverifikasi."""

import hashlib
import json
from pathlib import Path
from zipfile import ZIP_DEFLATED, ZipFile, ZipInfo

ROOT = Path(__file__).resolve().parents[1]


def berkas_paket():
    yield ROOT / "requirements.txt", "requirements.txt"
    for nama in ["main.py", "README.md"]:
        yield ROOT / "deploy/panel" / nama, nama
    for path in sorted((ROOT / "services/engine/app").glob("*.py")):
        yield path, path.relative_to(ROOT).as_posix()
    p = ROOT / "services/engine/scripts/unduh_model_vision.py"
    yield p, p.relative_to(ROOT).as_posix()
    manifest = ROOT / "services/engine/models/mobilesam.json"
    yield manifest, manifest.relative_to(ROOT).as_posix()
    for f in json.loads(manifest.read_text("utf-8"))["files"]:
        path = manifest.parent / f["local"]
        if hashlib.sha256(path.read_bytes()).hexdigest() != f["sha256"]:
            raise ValueError(f"Bobot {path.name} tidak sesuai manifest.")
        yield path, path.relative_to(ROOT).as_posix()
    for folder in ["data/fixtures", "data/sources"]:
        for path in sorted((ROOT / folder).rglob("*")):
            if path.is_file() and not path.is_relative_to(
                ROOT / "data/fixtures/kota/mentah"
            ):
                yield path, path.relative_to(ROOT).as_posix()


def buat():
    tujuan = ROOT / "output/deploy/petasurya-engine-botkeep.zip"
    tujuan.parent.mkdir(parents=True, exist_ok=True)
    with ZipFile(tujuan, "w", compression=ZIP_DEFLATED, compresslevel=6) as archive:
        for path, nama in berkas_paket():
            info = ZipInfo(nama, date_time=(2026, 10, 19, 0, 0, 0))
            info.compress_type = ZIP_DEFLATED
            info.external_attr = 0o644 << 16
            archive.writestr(info, path.read_bytes())
    data = {
        "berkas": tujuan.name,
        "bytes": tujuan.stat().st_size,
        "sha256": hashlib.sha256(tujuan.read_bytes()).hexdigest(),
    }
    tujuan.with_suffix(".json").write_text(json.dumps(data, indent=2) + "\n", "utf-8")
    print(json.dumps(data, indent=2))


if __name__ == "__main__":
    buat()
