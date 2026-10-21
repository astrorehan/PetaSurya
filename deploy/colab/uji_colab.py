"""Ukur satu inferensi baru melalui HTTP lalu hentikan proses pengujian."""

import argparse
import json
import os
import platform
import socket
import subprocess
import sys
import time
from pathlib import Path
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen


def memori_proses(pid):
    path = Path(f"/proc/{pid}/status")
    if not path.exists():
        return {"rss_mib": None, "puncak_rss_mib": None}
    data = {}
    for baris in path.read_text("utf-8").splitlines():
        if baris.startswith(("VmRSS:", "VmHWM:")):
            nama, ukuran = baris.split(":", 1)
            data[nama] = round(float(ukuran.split()[0]) / 1024, 1)
    return {"rss_mib": data.get("VmRSS"), "puncak_rss_mib": data.get("VmHWM")}


def panggil(base, path, data=None, timeout=120):
    request = Request(
        base + path,
        data=json.dumps(data).encode() if data is not None else None,
        headers={"Content-Type": "application/json"},
    )
    with urlopen(request, timeout=timeout) as response:
        return json.load(response)


def jalankan(root, building_id):
    with socket.socket() as soket:
        soket.bind(("127.0.0.1", 0))
        port = soket.getsockname()[1]
    base = f"http://127.0.0.1:{port}"
    lingkungan = {
        **os.environ,
        "SERVER_PORT": str(port),
        "PETASURYA_MODEL_THREADS": "1",
        "PETASURYA_PRELOAD_MODEL": "1",
        "PYTHONUNBUFFERED": "1",
    }
    log_path = root / "uji-engine.log"
    print("Menjalankan engine CPU untuk satu pengujian…", flush=True)
    with log_path.open("w", encoding="utf-8") as log:
        proses = subprocess.Popen(
            [sys.executable, str(root / "main.py")],
            cwd=root,
            env=lingkungan,
            stdout=log,
            stderr=subprocess.STDOUT,
        )
        try:
            batas = time.monotonic() + 120
            while True:
                if proses.poll() is not None:
                    raise RuntimeError(log_path.read_text("utf-8"))
                try:
                    ready = panggil(base, "/api/v1/ready", timeout=3)
                    if ready["status"] == "ready":
                        break
                except (URLError, TimeoutError):
                    pass
                if time.monotonic() >= batas:
                    raise TimeoutError(
                        "Engine belum siap setelah 120 detik. Baca uji-engine.log."
                    )
                time.sleep(1)
            print(json.dumps(ready), flush=True)
            memori_awal = memori_proses(proses.pid)
            mulai = time.perf_counter()
            paket = panggil(
                base, "/api/v1/scans", {"building_id": building_id, "force": True}
            )
            durasi = time.perf_counter() - mulai
            if paket["tersimpan"] or paket["analisis"] is None:
                raise RuntimeError("Pengujian tidak menghasilkan analisis baru.")
            hasil = {
                "runtime": {
                    "python": platform.python_version(),
                    "sistem": platform.platform(),
                    "jumlah_cpu": os.cpu_count(),
                    "threads_model": 1,
                },
                "ready": ready,
                "durasi_http_detik": round(durasi, 3),
                "memori_awal": memori_awal,
                "memori_sesudah_inferensi": memori_proses(proses.pid),
                "paket": paket,
            }
            (root / "hasil-uji-colab.json").write_text(
                json.dumps(hasil, ensure_ascii=False, indent=2, allow_nan=False) + "\n",
                encoding="utf-8",
            )
            analisis = paket["analisis"]
            print(
                json.dumps(
                    {
                        "building_id": building_id,
                        "metode": analisis["method"],
                        "luas_atap_m2": analisis["roof_area_m2"],
                        "luas_perhitungan_m2": analisis["usable_area_m2"],
                        "durasi_engine_detik": paket["durasi_detik"],
                        "durasi_http_detik": hasil["durasi_http_detik"],
                        "memori": hasil["memori_sesudah_inferensi"],
                    },
                    ensure_ascii=False,
                    indent=2,
                ),
                flush=True,
            )
            if analisis["method"] != "cv":
                print(
                    "PERHATIAN: keluaran memakai perkiraan OSM; baca peringatan pada JSON."
                )
            return hasil
        except HTTPError as error:
            raise RuntimeError(
                error.read().decode("utf-8", errors="replace")
            ) from error
        finally:
            if proses.poll() is None:
                proses.terminate()
                try:
                    proses.wait(timeout=15)
                except subprocess.TimeoutExpired:
                    proses.kill()
                    proses.wait()
            print("Proses HTTP pengujian sudah dihentikan.", flush=True)


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--building-id", type=int, default=304512048)
    args = parser.parse_args()
    if args.building_id <= 0:
        parser.error("ID bangunan harus positif.")
    jalankan(Path(__file__).resolve().parent, args.building_id)
