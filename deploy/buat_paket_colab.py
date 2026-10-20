"""Bentuk paket dan notebook pengujian CPU yang dapat diunggah ke Colab."""

import hashlib
import json
import sys
from pathlib import Path
from zipfile import ZIP_DEFLATED, ZipFile, ZipInfo

sys.path.insert(0, str(Path(__file__).resolve().parent))
from buat_paket_panel import ROOT, berkas_paket


def kode(sumber):
    return {
        "cell_type": "code",
        "metadata": {},
        "execution_count": None,
        "outputs": [],
        "source": sumber.splitlines(keepends=True),
    }


def buat():
    folder = ROOT / "deploy/colab"
    tujuan = ROOT / "output/deploy/petasurya-engine-colab.zip"
    tujuan.parent.mkdir(parents=True, exist_ok=True)
    with ZipFile(tujuan, "w", compression=ZIP_DEFLATED, compresslevel=6) as archive:
        isi = [(p, nama) for p, nama in berkas_paket() if nama != "README.md"]
        isi.extend(
            [
                (folder / "README.md", "README.md"),
                (folder / "uji_colab.py", "uji_colab.py"),
            ]
        )
        for path, nama in isi:
            info = ZipInfo(nama, date_time=(2026, 10, 19, 0, 0, 0))
            info.compress_type = ZIP_DEFLATED
            info.external_attr = 0o644 << 16
            archive.writestr(info, path.read_bytes())
    sha = hashlib.sha256(tujuan.read_bytes()).hexdigest()
    cells = [
        {
            "cell_type": "markdown",
            "metadata": {},
            "source": [
                "# PetaSurya · Uji CPU di Colab\n",
                (
                    "Pilih Python 3, CPU, runtime **2026.07** (Python 3.12). "
                    "Jalankan berurutan dan unggah `petasurya-engine-colab.zip`.\n"
                ),
                (
                    "Pengujian menjalankan model asli dengan inferensi baru. "
                    "Website belum diarahkan ke Colab. HTTP pengujian berhenti setelah selesai.\n"
                ),
            ],
        },
        kode("""import os, platform, sys
print("Python:", platform.python_version())
print("CPU:", os.cpu_count())
assert sys.version_info[:2] == (3, 12), "Pilih runtime version 2026.07 (Python 3.12)."
print("Runtime sesuai untuk engine CPU PetaSurya.")
"""),
        kode("""from pathlib import Path
if not Path("/content/petasurya-engine-colab.zip").exists():
    from google.colab import files
    files.upload()
assert Path("/content/petasurya-engine-colab.zip").exists(), "Unggah paket engine Colab."
"""),
        kode(f'''import hashlib, os, subprocess, sys, zipfile
from pathlib import Path
arsip = Path("/content/petasurya-engine-colab.zip")
assert hashlib.sha256(arsip.read_bytes()).hexdigest() == "{sha}", "Hash paket tidak cocok."
root = Path("/content/petasurya-uji")
root.mkdir(exist_ok=True)
with zipfile.ZipFile(arsip) as z:
    for nama in z.namelist():
        assert (root / nama).resolve().is_relative_to(root.resolve()), "Path ZIP tidak valid."
    z.extractall(root)
lingkungan = {{**os.environ, "PETASURYA_MODEL_THREADS": "1", "PETASURYA_PRELOAD_MODEL": "1"}}
subprocess.run([sys.executable, str(root / "main.py"), "--check"], env=lingkungan, check=True)
'''),
        kode("""ID_BANGUNAN = 304512048
subprocess.run(
    [sys.executable, str(root / "uji_colab.py"), "--building-id", str(ID_BANGUNAN)],
    check=True,
)
"""),
        kode("""import html, json, math
from IPython.display import HTML, display
hasil = json.loads((root / "hasil-uji-colab.json").read_text())
p = hasil["paket"]
a, f = p["analisis"], p["bingkai"]
gambar = "".join(
    f'<image href="{html.escape(t["url"], quote=True)}" '
    f'x="{t["x"]}" y="{t["y"]}" width="256" height="256"/>'
    for t in f["tiles"]
)
geometri = a.get("mask_geojson") or p["bangunan"]["geom"]
poligon = geometri["coordinates"]
if geometri["type"] == "Polygon":
    poligon = [poligon]
n = 256 * 2 ** f["zoom"]
def pixel(titik):
    lon, lat = titik
    y = (1 - math.asinh(math.tan(math.radians(lat))) / math.pi) / 2 * n - f["y0"]
    return ((lon + 180) / 360 * n - f["x0"], y)
d = " ".join(
    "M" + "L".join(f"{x:.2f},{y:.2f}" for x,y in map(pixel, ring)) + "Z"
    for poly in poligon for ring in poly
)
batas = (f'<path d="{d}" fill="#ffc76a" fill-opacity=".25" stroke="#ffc76a" '
         'stroke-width="1.5" fill-rule="evenodd"/>')
def svg(overlay):
    return (f'<svg viewBox="0 0 {f["lebar"]} {f["tinggi"]}" '
            f'style="width:100%;background:#111">{gambar}{overlay}</svg>')
display(HTML(
    f'<h3>Gedung {ID_BANGUNAN} · {html.escape(a["method"])}</h3>'
    f'<p>Luas atap {a["roof_area_m2"]:.1f} m² · proses {p["durasi_detik"]:.2f} detik</p>'
    '<div style="display:flex;gap:12px;flex-wrap:wrap">'
    f'<div style="flex:1;min-width:240px">Citra asli{svg("")}</div>'
    f'<div style="flex:1;min-width:240px">Hasil analisis{svg(batas)}</div></div>'
    '<p>Esri · Vantor · Earthstar Geographics · © OpenStreetMap contributors. '
    'Batas belum diverifikasi; halangan dan bayangan belum diukur.</p>'
))
print("RAM engine:", hasil["memori_sesudah_inferensi"])
print("Hasil JSON:", root / "hasil-uji-colab.json")
"""),
        kode("""from google.colab import files
print(json.dumps({
    k: hasil[k] for k in [
        "runtime", "ready", "durasi_http_detik", "memori_sesudah_inferensi"
    ]
}, indent=2))
files.download(str(root / "hasil-uji-colab.json"))
"""),
    ]
    notebook = {
        "nbformat": 4,
        "nbformat_minor": 5,
        "metadata": {
            "colab": {"name": "PetaSurya-Uji-Colab.ipynb"},
            "kernelspec": {"name": "python3", "display_name": "Python 3"},
            "language_info": {"name": "python", "version": "3.12"},
        },
        "cells": cells,
    }
    for nomor, cell in enumerate(cells):
        cell["id"] = f"uji-{nomor}"
    (folder / "PetaSurya-Uji-Colab.ipynb").write_text(
        json.dumps(notebook, ensure_ascii=False, indent=2) + "\n", "utf-8"
    )
    print(
        json.dumps(
            {"berkas": str(tujuan), "bytes": tujuan.stat().st_size, "sha256": sha}
        )
    )


if __name__ == "__main__":
    buat()
