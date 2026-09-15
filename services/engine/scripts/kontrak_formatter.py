"""Pemformat tambahan untuk datamodel-codegen (dipanggil `pnpm gen:contracts`).

JSON Schema kontrak hanya berisi `$defs`; dokumen akarnya sendiri bukan tipe,
tetapi datamodel-codegen tetap membuatkan `class Model(RootModel[Any])` kosong
untuknya. Kelas itu dibuang di sini supaya `app/contracts.py` hanya memuat
kelas yang benar-benar ada di registri zod. Pemformat kustom dijalankan
setelah ruff bawaan, jadi ruff dipanggil ulang agar impor yang jadi tak
terpakai ikut hilang dan berkas lolos `ruff check` di CI.
"""

from __future__ import annotations

import re
import subprocess
import sys

from datamodel_code_generator.format import CustomCodeFormatter

_AKAR_KOSONG = re.compile(r"\n\nclass Model\(RootModel\[Any\]\):\n    root: Any\n")


def _ruff(*argumen: str, kode: str) -> str:
    hasil = subprocess.run(
        [sys.executable, "-m", "ruff", *argumen, "-"],
        input=kode,
        capture_output=True,
        text=True,
        encoding="utf-8",
        check=True,
    )
    return hasil.stdout


class CodeFormatter(CustomCodeFormatter):
    def apply(self, code: str) -> str:
        kode = _AKAR_KOSONG.sub("\n", code, count=1)
        kode = _ruff("check", "--fix", "--quiet", "--exit-zero", kode=kode)
        return _ruff("format", "--quiet", kode=kode)
