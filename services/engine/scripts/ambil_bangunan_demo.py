"""Tambahkan enam footprint OSM terdekat dengan FH UNIB melalui Map API."""

import json
import xml.etree.ElementTree as ET
from pathlib import Path
from urllib.request import Request, urlopen

from shapely.geometry import Polygon

from app.vision import luas_geodesik

ROOT = Path(__file__).resolve().parents[3]
DIR = ROOT / "data/fixtures/bangunan"
URL = "https://api.openstreetmap.org/api/0.6/map?bbox=102.265,-3.763,102.270,-3.758"


def buat_bangunan() -> None:
    mentah = DIR / "mentah" / "osm-unib-20261013.osm"
    if not mentah.exists():
        with urlopen(Request(URL, headers={"User-Agent": "PetaSurya/0.1"}), timeout=30) as r:
            mentah.write_bytes(r.read())
    osm = ET.fromstring(mentah.read_bytes())
    nodes = {
        n.attrib["id"]: [float(n.attrib["lon"]), float(n.attrib["lat"])]
        for n in osm.findall("node")
    }
    awal = {991016391, 1146141501, 1145010599}
    pilihan = []
    for way in osm.findall("way"):
        tags = {t.attrib["k"]: t.attrib["v"] for t in way.findall("tag")}
        simpul = [n.attrib["ref"] for n in way.findall("nd")]
        identitas = int(way.attrib["id"])
        if "building" not in tags or identitas in awal or simpul[0] != simpul[-1]:
            continue
        if not all(n in nodes for n in simpul):
            continue
        cincin = [nodes[n] for n in simpul]
        geom = Polygon(cincin)
        if not geom.is_valid or luas_geodesik(geom) < 100:
            continue
        jarak = (geom.centroid.x - 102.26828) ** 2 + (geom.centroid.y + 3.76063) ** 2
        pilihan.append((jarak, identitas, way, tags, cincin, geom))
    for _, identitas, way, tags, cincin, geom in sorted(pilihan)[:6]:
        hasil = {
            "_catatan": (
                "Bangunan nyata OSM; dipilih berdasarkan jarak dari FH UNIB, bukan skor CV."
            ),
            "_sumber": {
                "penerbit": "OpenStreetMap contributors (ODbL 1.0)",
                "url_kueri": URL,
                "kueri": "bbox=102.265,-3.763,102.270,-3.758",
                "diambil": "2026-10-13",
                "osm_timestamp": way.attrib.get("timestamp"),
                "osm_version": int(way.attrib["version"]),
                "mentah": "mentah/osm-unib-20261013.osm",
            },
            "id": identitas,
            "source": "osm",
            "source_ref": f"way/{identitas}",
            "geom": {"type": "Polygon", "coordinates": [cincin]},
            "footprint_m2": round(luas_geodesik(geom), 1),
            "building_tag": tags["building"],
            "levels": int(tags["building:levels"])
            if tags.get("building:levels", "").isdigit()
            else None,
            "nama": tags.get("name") or f"Bangunan UNIB {identitas}",
            "region_code": "1771",
        }
        tujuan = DIR / f"unib-{identitas}.json"
        tujuan.write_text(json.dumps(hasil, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
        print(f"{identitas}: {hasil['nama']} ({hasil['footprint_m2']} m²)")
    if len(pilihan) < 6:
        raise ValueError("Cuplikan OSM belum memiliki enam bangunan tambahan.")


if __name__ == "__main__":
    buat_bangunan()
