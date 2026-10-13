from collections import OrderedDict

import pytest


@pytest.fixture(autouse=True)
def cache_pengujian(tmp_path, monkeypatch):
    monkeypatch.setenv("PETASURYA_CACHE_DIR", str(tmp_path))
    monkeypatch.setattr("app.analyses._hasil", OrderedDict())
