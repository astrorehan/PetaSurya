"""Snapshot footprint OSM Kota Bengkulu untuk agregasi dan peta tanpa jaringan.

Jalankan `uv run python -m scripts.ambil_bangunan_kota` untuk membentuk ulang
data dari respons mentah. `--unduh` memperbarui respons dari Overpass.
Keluaran: `bangunan-bengkulu.json.gz` (L6, luas dan wilayah) serta
`footprint-bengkulu.json.gz` (L1, geometri way untuk dipilih di peta).
Respons mentah dan keluaran dikompresi gzip deterministik tanpa cap waktu.
"""

import argparse
import gzip
import json
from pathlib import Path
from urllib.parse import urlencode
from urllib.request import Request, urlopen

import numpy as np
from shapely import prepare
from shapely.geometry import LineString, MultiPolygon, Polygon, mapping, shape
from shapely.ops import polygonize, unary_union

from app.aggregate import sha256_teks
from app.buildings import batas_kota
from app.vision import luas_geodesik

ROOT = Path(__file__).resolve().parents[3]
DIR = ROOT / "data/fixtures/kota"
URL = "https://overpass-api.de/api/interpreter"
QUERY = (
    '[out:json][timeout:90];(way["building"]["building"!="no"](area:3616196019);'
    'relation["building"]["building"!="no"]["type"="multipolygon"]'
    "(area:3616196019););out body geom;"
)
# Titik per derajat; OSM menyimpan koordinat 7 desimal (±1,1 cm di ekuator).
PRESISI = 10_000_000


def lantai(tags: dict) -> int | None:
    nilai = tags.get("building:levels", "")
    return int(nilai) if nilai.isdigit() and int(nilai) > 0 else None


def poligon_relasi(elemen: dict):
    """Rangkai outer/inner multipolygon; lubang tidak dihitung sebagai atap."""
    cincin = {}
    for role in ("outer", "inner"):
        garis = [
            LineString([(p["lon"], p["lat"]) for p in anggota["geometry"]])
            for anggota in elemen.get("members", [])
            if anggota.get("role") == role and len(anggota.get("geometry", [])) >= 2
        ]
        cincin[role] = list(polygonize(unary_union(garis)))
    poligon = [
        Polygon(
            p.exterior.coords,
            [h.exterior.coords for h in cincin["inner"] if p.covers(h.representative_point())],
        )
        for p in cincin["outer"]
    ]
    return MultiPolygon(poligon)


def normalkan(payload: dict) -> tuple[list[dict], dict]:
    """Satu footprint per objek; way anggota relasi tidak dihitung dua kali."""
    kota = batas_kota()
    prepare(kota)
    hasil = {}
    anggota_terpakai = set()
    ditolak = {"geometri": 0, "di_luar_kota": 0, "anggota_relasi": 0, "bagian_bangunan": 0}
    elemen = sorted(payload["elements"], key=lambda e: (e["type"] != "relation", e["id"]))
    for item in elemen:
        tags = item.get("tags", {})
        if tags.get("building") in (None, "no"):
            continue
        if item["type"] == "way" and item["id"] in anggota_terpakai:
            ditolak["anggota_relasi"] += 1
            continue
        if tags.get("building:part") not in (None, "no"):
            ditolak["bagian_bangunan"] += 1
            continue
        try:
            if item["type"] == "relation":
                geom = poligon_relasi(item)
            else:
                titik = [(p["lon"], p["lat"]) for p in item.get("geometry", [])]
                if len(titik) < 4 or titik[0] != titik[-1]:
                    raise ValueError("Way bukan poligon tertutup")
                geom = Polygon(titik)
            if geom.is_empty or not geom.is_valid:
                raise ValueError("Poligon tidak valid")
            luas = luas_geodesik(geom)
            if luas <= 0:
                raise ValueError("Luas kosong")
        except (KeyError, TypeError, ValueError):
            ditolak["geometri"] += 1
            continue
        if not kota.covers(geom.representative_point()):
            ditolak["di_luar_kota"] += 1
            continue
        ref = f"{item['type']}/{item['id']}"
        hasil[ref] = {
            "source_ref": ref,
            "nama": tags.get("name"),
            "geom": mapping(geom),
            "footprint_m2": luas,
            "tag": tags["building"],
            "lantai": lantai(tags),
        }
        if item["type"] == "relation":
            anggota_terpakai.update(m["ref"] for m in item.get("members", []) if m["type"] == "way")
    return [hasil[k] for k in sorted(hasil)], ditolak


def indeks_peta(bangunan: list[dict]) -> dict:
    """Footprint way untuk pemilihan di peta, disusun per kolom dan urut ID.

    Koordinat dibulatkan ke 1e-7° lalu disimpan sebagai selisih terhadap titik
    sebelumnya dalam satu daftar datar; cumsum memulihkannya tanpa galat.
    Titik penutup cincin tidak disimpan. Relasi multipolygon dilewati karena
    pemindaian memakai ID way dan geometri Polygon.

    Perkiraan rumah: persentil 5–95 (interpolasi linear) luas way bertag
    building=house pada snapshot yang sama, diterapkan ke building=yes tanpa
    nama. Bangunan bernama di rentang ini umumnya masjid, sekolah, atau toko.
    """
    way = sorted(
        (b for b in bangunan if b["source_ref"].startswith("way/")),
        key=lambda b: int(b["source_ref"].removeprefix("way/")),
    )
    luas_rumah = [b["footprint_m2"] for b in way if b["tag"] == "house"]
    bawah, atas = np.percentile(luas_rumah, [5, 95])
    kolom = {k: [] for k in ("id", "tag", "nama", "lantai", "luas_m2", "n_titik", "xy")}
    x0 = y0 = 0
    for b in way:
        cincin = b["geom"]["coordinates"][0][:-1]
        kolom["id"].append(int(b["source_ref"].removeprefix("way/")))
        kolom["tag"].append(b["tag"])
        kolom["nama"].append(b["nama"])
        kolom["lantai"].append(b["lantai"])
        kolom["luas_m2"].append(round(b["footprint_m2"], 1) or b["footprint_m2"])
        kolom["n_titik"].append(len(cincin))
        for lon, lat in cincin:
            x, y = round(lon * PRESISI), round(lat * PRESISI)
            kolom["xy"] += (x - x0, y - y0)
            x0, y0 = x, y
    return {
        "presisi_derajat": 1 / PRESISI,
        "perkiraan_rumah": {
            "min_m2": round(float(bawah), 1),
            "max_m2": round(float(atas), 1),
            "dasar": (
                f"Persentil 5–95 luas {len(luas_rumah)} footprint OSM bertag building=house "
                "di snapshot yang sama, diterapkan pada building=yes tanpa nama; "
                "bukan klasifikasi."
            ),
        },
        "n_relasi_dilewati": len(bangunan) - len(way),
        **kolom,
    }


def tulis_gzip(target: Path, data: dict) -> int:
    isi = json.dumps(data, ensure_ascii=False, separators=(",", ":")).encode()
    target.write_bytes(gzip.compress(isi, mtime=0))
    return target.stat().st_size


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--unduh", action="store_true")
    parser.add_argument("--tanggal", default="2026-10-14")
    args = parser.parse_args()
    raw = DIR / f"mentah/bangunan-bengkulu-{args.tanggal.replace('-', '')}.overpass.json.gz"
    if args.unduh:
        request = Request(
            URL,
            data=urlencode({"data": QUERY}).encode(),
            headers={"User-Agent": "PetaSurya/0.1", "Accept": "application/json"},
        )
        with urlopen(request, timeout=110) as response:
            data = response.read(120_000_001)
        if len(data) > 120_000_000:
            raise ValueError("Respons melebihi 120 MB")
        payload = json.loads(data)
        if payload.get("remark") or not payload.get("elements"):
            raise ValueError(payload.get("remark", "Snapshot kosong"))
        raw.parent.mkdir(parents=True, exist_ok=True)
        raw.write_bytes(gzip.compress(data, mtime=0))
    payload = json.loads(gzip.decompress(raw.read_bytes()))
    bangunan, ditolak = normalkan(payload)
    peta = indeks_peta(bangunan)
    berkas_batas = ROOT / "data/fixtures/wilayah/kecamatan-kota-bengkulu.geojson"
    wilayah = [
        (str(f["properties"]["id"]), shape(f["geometry"]))
        for f in json.loads(berkas_batas.read_text("utf-8"))["features"]
    ]
    wilayah.sort(key=lambda item: item[0])
    for _, geom in wilayah:
        prepare(geom)
    for b in bangunan:
        pusat = shape(b.pop("geom")).representative_point()
        del b["tag"], b["lantai"]
        b["wilayah_id"] = next((id for id, geom in wilayah if geom.covers(pusat)), None)
    sumber = {
        "penerbit": "OpenStreetMap contributors (ODbL 1.0), melalui Overpass API",
        "url": URL + "?" + urlencode({"data": QUERY}),
        "diambil": args.tanggal,
        "timestamp_osm": payload["osm3s"]["timestamp_osm_base"],
        "catatan": (
            "Snapshot footprint yang dipetakan di OSM, bukan sensus seluruh bangunan. "
            "Geometri valid dengan titik interior di batas Kota Bengkulu; "
            "lubang dipertahankan dan way anggota multipolygon tidak diduplikasi."
        ),
    }
    paket = {
        "sumber": sumber,
        "sha256_batas_kecamatan": sha256_teks(berkas_batas),
        "ditolak": ditolak,
        "bangunan": bangunan,
    }
    ukuran = tulis_gzip(DIR / "bangunan-bengkulu.json.gz", paket)
    ukuran_peta = tulis_gzip(DIR / "footprint-bengkulu.json.gz", {"sumber": sumber, **peta})
    print(
        json.dumps(
            {
                "bangunan": len(bangunan),
                "ditolak": ditolak,
                "bytes": ukuran,
                "peta": len(peta["id"]),
                "perkiraan_rumah": peta["perkiraan_rumah"],
                "bytes_peta": ukuran_peta,
            },
            ensure_ascii=False,
        )
    )


if __name__ == "__main__":
    main()
