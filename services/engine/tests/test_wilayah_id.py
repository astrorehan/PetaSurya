from app.wilayah_id import di_indonesia, provinsi_di_titik, semua_provinsi


def test_34_provinsi_dengan_kode_iso():
    p = semua_provinsi()
    assert len(p) == 34
    assert all(x.iso.startswith("ID-") for x in p)


def test_titik_kota_dan_pantai():
    # FH UNIB, Kota Bengkulu
    assert provinsi_di_titik(-3.7605, 102.2725).iso == "ID-BE"
    # Monas, Jakarta
    assert provinsi_di_titik(-6.1754, 106.8272).iso == "ID-JK"
    # Pantai Panjang Bengkulu, di tepi garis pantai yang disederhanakan
    assert provinsi_di_titik(-3.8105, 102.2790).iso == "ID-BE"
    # Jayapura, Makassar, Denpasar
    assert provinsi_di_titik(-2.5337, 140.7181).iso == "ID-PA"
    assert provinsi_di_titik(-5.1477, 119.4327).iso == "ID-SN"
    assert provinsi_di_titik(-8.6705, 115.2126).iso == "ID-BA"


def test_luar_negeri_ditolak():
    assert not di_indonesia(1.3521, 103.8198)  # Singapura
    assert not di_indonesia(-12.4634, 130.8456)  # Darwin
    assert not di_indonesia(0.0, 90.0)  # Samudra Hindia
