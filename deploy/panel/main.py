"""Jalankan engine dari akar paket Python pada hosting aplikasi."""

import hashlib
import importlib.util
import json
import os
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent
if not (ROOT / "services/engine/app").is_dir():
    ROOT = Path(__file__).resolve().parents[2]


def siapkan_dependensi():
    if sys.version_info[:2] != (3, 12):
        raise RuntimeError("Pilih runtime Python 3.12 untuk engine PetaSurya.")
    paket = ROOT / ".runtime/packages"
    sys.path.insert(0, str(paket))
    modul = [
        "fastapi",
        "uvicorn",
        "onnxruntime",
        "cv2",
        "PIL",
        "pyproj",
        "shapely",
        "pvlib",
        "yaml",
        "dotenv",
    ]
    requirements = ROOT / "requirements.txt"
    sha = hashlib.sha256(requirements.read_bytes()).hexdigest()
    stamp = ROOT / ".runtime/dependensi.sha256"
    berubah = stamp.exists() and stamp.read_text("utf-8").strip() != sha
    if berubah or any(importlib.util.find_spec(nama) is None for nama in modul):
        paket.mkdir(parents=True, exist_ok=True)
        print("Memasang dependensi Python ke direktori aplikasi…", flush=True)
        subprocess.run(
            [
                sys.executable,
                "-m",
                "pip",
                "install",
                "--no-cache-dir",
                "--disable-pip-version-check",
                "--only-binary=:all:",
                "--require-hashes",
                "--upgrade",
                "--target",
                str(paket),
                "-r",
                str(requirements),
            ],
            check=True,
        )
        stamp.write_text(sha + "\n", "utf-8")
        importlib.invalidate_caches()


def jalankan():
    siapkan_dependensi()
    from dotenv import load_dotenv

    load_dotenv(ROOT / ".env", override=False)
    os.environ.setdefault("PETASURYA_MODEL_THREADS", "1")
    os.environ.setdefault("PETASURYA_PRELOAD_MODEL", "1")
    os.environ.setdefault("PETASURYA_CACHE_DIR", str(ROOT / "data/cache"))
    engine = ROOT / "services/engine"
    sys.path.insert(0, str(engine))
    os.chdir(engine)
    from scripts.unduh_model_vision import DIR_MODEL, unduh

    model = json.loads((DIR_MODEL / "mobilesam.json").read_text("utf-8"))
    for berkas in model["files"]:
        unduh(berkas, model)
    if "--check" in sys.argv:
        from app.main import ready

        hasil = ready()
        if not isinstance(hasil, dict) or hasil["status"] != "ready":
            raise RuntimeError("Model belum siap.")
        print(json.dumps(hasil), flush=True)
        return
    port = int(os.environ.get("SERVER_PORT") or os.environ.get("PORT") or "8000")
    if not 1 <= port <= 65535:
        raise ValueError("SERVER_PORT atau PORT harus berada dalam rentang 1–65535.")
    import uvicorn

    print(f"Engine mendengarkan 0.0.0.0:{port}", flush=True)
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=port,
        workers=1,
        limit_concurrency=8,
        server_header=False,
    )


if __name__ == "__main__":
    jalankan()
