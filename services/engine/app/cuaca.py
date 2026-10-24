"""L3: cuaca per jam NASA POWER untuk titik mana pun di Indonesia.

Cuaca 2024 satu sel dipakai bersama oleh semua bangunan di sel itu. Respons mentah
disimpan di cache disk; titik yang sama dengan berkas bawaan Bengkulu dibaca dari
fixture tanpa jaringan.
"""

from __future__ import annotations

import gzip
import json
import math
import os
import threading
import time
from dataclasses import dataclass
from functools import lru_cache
from pathlib import Path
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

import numpy as np
import pandas as pd

VERSION = "l3cuaca.2026.10.25"

DIR_ROOT = Path(__file__).resolve().parents[3]
BERKAS_CUACA = DIR_ROOT / "data" / "fixtures" / "cuaca" / "mentah" / "nasa-power-bengkulu-2024.json"

URL_NASA = "https://power.larc.nasa.gov/api/temporal/hourly/point"
USER_AGENT = "PetaSurya/0.1 (+https://github.com/astrorehan/PetaSurya)"
SUMBER = "NASA POWER Hourly (CERES SYN1deg, MERRA-2)"
TAHUN = 2024
JAM_TAHUN = 8784  # 366 hari × 24 jam; 2024 adalah tahun kabisat.
TIMEOUT_DETIK = 30
PERCOBAAN = 2

# Titik kueri berkas bawaan (sumber.yaml: nasa_power_hourly_bengkulu_2024).
LAT_BAWAAN = -3.76268
LON_BAWAAN = 102.27168

# Resolusi asli POWER: surya (CERES SYN1deg) 1° × 1° dengan tepi di bilangan bulat;
# meteorologi (MERRA-2) 0,5° lintang × 0,625° bujur dengan pusat di kelipatan ukuran sel.
# Tepi sel dikonfirmasi dengan menyapu titik uji ke API pada 25 Okt 2026.
SEL_SURYA_DERAJAT = 1.0
SEL_MET_LAT = 0.5
SEL_MET_LON = 0.625

NILAI_HILANG = -999.0  # fill_value pada header respons POWER
MAKS_JAM_HILANG = 3  # celah lebih panjang dari ini dianggap data rusak
PARAMETER = ("ALLSKY_SFC_SW_DWN", "ALLSKY_SFC_SW_DNI", "ALLSKY_SFC_SW_DIFF", "T2M", "WS2M")

Kunci = tuple[int, int, int, int]


@dataclass(frozen=True)
class InfoCuaca:
    """Titik dan asal data cuaca yang dipakai simulasi."""

    lat: float
    lon: float
    tahun: int
    sumber: str
    bawaan: bool


def kunci_sel(lat: float, lon: float) -> Kunci:
    """Sel POWER tempat titik berada: (surya_lat, surya_lon, met_lat, met_lon)."""
    if not (math.isfinite(lat) and math.isfinite(lon)) or abs(lat) > 90 or abs(lon) > 180:
        raise ValueError("Koordinat tidak valid untuk pengambilan cuaca.")
    return (
        math.floor(lat / SEL_SURYA_DERAJAT),
        math.floor(lon / SEL_SURYA_DERAJAT),
        math.floor((lat + SEL_MET_LAT / 2) / SEL_MET_LAT),
        math.floor((lon + SEL_MET_LON / 2) / SEL_MET_LON),
    )


def titik_sel(kunci: Kunci) -> tuple[float, float]:
    """Titik kueri kanonik: pusat irisan sel surya dan sel meteorologi.

    Titik di dalam kedua sel, jauh dari tepi, sehingga respons tidak bergantung
    pada bangunan mana yang lebih dahulu meminta.
    """
    sl, so, ml, mo = kunci

    def tengah(surya: int, met: int, ukuran: float) -> float:
        bawah = max(surya * SEL_SURYA_DERAJAT, (met - 0.5) * ukuran)
        atas = min((surya + 1) * SEL_SURYA_DERAJAT, (met + 0.5) * ukuran)
        return round((bawah + atas) / 2, 4)

    return tengah(sl, ml, SEL_MET_LAT), tengah(so, mo, SEL_MET_LON)


KUNCI_BAWAAN: Kunci = kunci_sel(LAT_BAWAAN, LON_BAWAAN)


def _dir_cache() -> Path:
    return Path(os.environ.get("PETASURYA_CACHE_DIR", DIR_ROOT / "data" / "cache")) / "cuaca"


def _berkas_cache(kunci: Kunci) -> Path:
    nama = "_".join(str(k) for k in kunci)
    return _dir_cache() / f"nasa-power-{TAHUN}-{nama}.json.gz"


def _ke_dataframe(payload: dict) -> pd.DataFrame:
    """Respons POWER → tabel per jam. Indeks UTC dilabeli ulang ke Asia/Jakarta.

    Pelabelan zona tidak menggeser instan waktu; pvlib mengubah indeks bertanda zona
    ke UTC sebelum menghitung posisi matahari, sehingga tetap benar di luar WIB.
    """
    try:
        parameter = payload["properties"]["parameter"]
        deret = {nama: parameter[nama] for nama in PARAMETER}
    except (KeyError, TypeError) as error:
        raise OSError("Respons cuaca NASA POWER tidak lengkap.") from error
    jam = list(deret["T2M"])
    if len(jam) != JAM_TAHUN or any(list(d) != jam for d in deret.values()):
        raise OSError("Respons cuaca NASA POWER tidak mencakup 8.784 jam tahun 2024.")
    try:
        index = pd.to_datetime(jam, format="%Y%m%d%H", utc=True).tz_convert("Asia/Jakarta")
        tabel = pd.DataFrame(
            {
                "ghi": list(deret["ALLSKY_SFC_SW_DWN"].values()),
                "dni": list(deret["ALLSKY_SFC_SW_DNI"].values()),
                "dhi": list(deret["ALLSKY_SFC_SW_DIFF"].values()),
                "temp_air": list(deret["T2M"].values()),
                "wind_speed": list(deret["WS2M"].values()),
            },
            index=index,
            dtype=float,
        )
    except (ValueError, TypeError) as error:
        raise OSError("Respons cuaca NASA POWER tidak dapat dibaca.") from error
    tabel = tabel.mask(tabel == NILAI_HILANG)
    if tabel.isna().any().any():
        # Celah pendek diinterpolasi linear; celah panjang berarti data sel rusak.
        tabel = tabel.interpolate(limit=MAKS_JAM_HILANG, limit_direction="both")
        if tabel.isna().any().any():
            raise OSError("Data cuaca NASA POWER untuk lokasi ini memiliki celah panjang.")
    if not np.isfinite(tabel.to_numpy()).all():
        raise OSError("Respons cuaca NASA POWER memuat nilai tidak berhingga.")
    return tabel.clip(lower=0)


def _unduh(url: str) -> bytes:
    """GET dengan batas waktu; ulang sekali untuk 429/5xx dan galat jaringan."""
    galat: Exception | None = None
    for percobaan in range(PERCOBAAN):
        try:
            with urlopen(
                Request(url, headers={"User-Agent": USER_AGENT}), timeout=TIMEOUT_DETIK
            ) as r:
                return r.read()
        except HTTPError as error:
            galat = error
            if error.code != 429 and error.code < 500:
                break
        except (URLError, TimeoutError, OSError) as error:
            galat = error
        if percobaan + 1 < PERCOBAAN:
            time.sleep(1.5)
    raise OSError("Data cuaca NASA POWER tidak dapat diambil. Coba lagi sebentar lagi.") from galat


def ambil_nasa(lat: float, lon: float) -> dict:
    """Ambil cuaca per jam 2024 satu titik dari NASA POWER (UTC, community RE)."""
    url = (
        f"{URL_NASA}?parameters={','.join(PARAMETER)}&community=RE"
        f"&longitude={lon}&latitude={lat}&start={TAHUN}0101&end={TAHUN}1231"
        "&format=JSON&time-standard=UTC"
    )
    mentah = _unduh(url)
    try:
        return json.loads(mentah)
    except ValueError as error:
        raise OSError("Respons cuaca NASA POWER bukan JSON yang sah.") from error


_kunci_kunci: dict[Kunci, threading.Lock] = {}
_kunci_global = threading.Lock()


def _kunci_untuk(kunci: Kunci) -> threading.Lock:
    with _kunci_global:
        return _kunci_kunci.setdefault(kunci, threading.Lock())


def _baca_cache(berkas: Path) -> pd.DataFrame | None:
    if not berkas.exists():
        return None
    try:
        return _ke_dataframe(json.loads(gzip.decompress(berkas.read_bytes())))
    except (OSError, ValueError, EOFError):
        berkas.unlink(missing_ok=True)  # berkas rusak: ambil ulang
        return None


def _simpan_cache(berkas: Path, payload: dict) -> None:
    berkas.parent.mkdir(parents=True, exist_ok=True)
    sementara = berkas.with_name(f"{berkas.name}.{os.getpid()}.{threading.get_ident()}.tmp")
    sementara.write_bytes(gzip.compress(json.dumps(payload).encode("utf-8"), compresslevel=6))
    os.replace(sementara, berkas)


@lru_cache(maxsize=1)
def muat_cuaca_bengkulu() -> pd.DataFrame:
    """Muat dan cache dataset cuaca hourly 2024 NASA POWER titik Bengkulu."""
    return _ke_dataframe(json.loads(BERKAS_CUACA.read_text(encoding="utf-8")))


@lru_cache(maxsize=16)
def _muat_sel(kunci: Kunci) -> tuple[pd.DataFrame, InfoCuaca]:
    if kunci == KUNCI_BAWAAN:
        info = InfoCuaca(LAT_BAWAAN, LON_BAWAAN, TAHUN, SUMBER, bawaan=True)
        return muat_cuaca_bengkulu(), info
    lat, lon = titik_sel(kunci)
    info = InfoCuaca(lat, lon, TAHUN, SUMBER, bawaan=False)
    berkas = _berkas_cache(kunci)
    with _kunci_untuk(kunci):
        # Cek ulang di dalam kunci: permintaan lain mungkin baru selesai menulis.
        if (tabel := _baca_cache(berkas)) is not None:
            return tabel, info
        payload = ambil_nasa(lat, lon)
        tabel = _ke_dataframe(payload)
        try:
            _simpan_cache(berkas, payload)
        except OSError:
            pass  # cache gagal ditulis tidak membatalkan simulasi
        return tabel, info


def muat_cuaca(lat: float, lon: float) -> tuple[pd.DataFrame, InfoCuaca]:
    """Cuaca per jam 2024 sel POWER yang memuat titik (lat, lon).

    Kolom: ghi, dni, dhi (Wh/m² per jam ≈ W/m² rerata), temp_air (°C), wind_speed (m/s).
    Titik dalam sel yang sama dengan berkas bawaan Bengkulu memakai berkas itu tanpa
    jaringan. Kegagalan jaringan, HTTP atau penguraian melempar OSError.
    """
    return _muat_sel(kunci_sel(lat, lon))
