import { FaktorEmisiDiperlukan, HasilAtap, KeadaanAtap } from "@/components/HasilAtap";
import { DATA_DEMO } from "@/lib/demo";
import { hitungUlangAtap, muatPemindaian } from "@/lib/api";
import { asumsiDenganWilayah, bacaFaktorEmisi, perluFaktorEmisi, wilayahBangunan } from "@/lib/wilayah";
import { PROFIL_SIMULASI, type ProfilSimulasi, areaSkenario, paketContoh, profilBangunan, potensiLuas } from "@/lib/pemindaian";

const ALIAS: Record<string, number> = {
  contoh: 991016391, "3f8c-contoh": 991016391,
  rumah: 1145010599, limun: 1145010599,
  unib: 1146141501, kampus: 1146141501,
};

export default async function HalamanAtap({ params, searchParams }: {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{profil?: string;kwp?:string;ef?:string}>;
}) {
  const { id } = await params;
  const idBersih = decodeURIComponent(id).trim().toLowerCase();
  if (idBersih === "galat" || idBersih === "error") return <KeadaanAtap jenis="galat" id={id} />;
  const identitas = ALIAS[idBersih] ?? Number(idBersih);
  if (!Number.isSafeInteger(identitas) || identitas <= 0) return <KeadaanAtap jenis="kosong" id={id}/>;
  const tersimpan = DATA_DEMO.find(d => d.bangunan.id === identitas);
  const pilihan = await searchParams;
  try {
    const paket = await muatPemindaian(identitas);
    if (!paket.analisis) return <KeadaanAtap jenis="kosong" id={String(identitas)}/>;
    const input = pilihan?.profil;
    const profil: ProfilSimulasi = input && Object.hasOwn(PROFIL_SIMULASI,input) ? input as ProfilSimulasi : profilBangunan(paket.bangunan);
    const acuan = PROFIL_SIMULASI[profil].data;
    const maksimum=potensiLuas(paket);
    const diminta=Number(pilihan?.kwp);
    const kapasitas=Number.isFinite(diminta)&&diminta>=.55 ? Math.min(maksimum,diminta) : Math.min(maksimum,acuan.asumsi.daya_va/1000);
    const wilayah = await wilayahBangunan(paket.bangunan);
    // Wilayah tanpa faktor emisi resmi tidak diberi tebakan: faktor diisi pengguna dulu.
    const manual = bacaFaktorEmisi(pilihan?.ef);
    if (wilayah && perluFaktorEmisi(wilayah, paket.bangunan) && !manual) {
      return <FaktorEmisiDiperlukan id={String(identitas)} bangunan={paket.bangunan} wilayah={wilayah} profil={input} kwp={pilihan?.kwp} tidakSah={pilihan?.ef !== undefined}/>;
    }
    const simulasi = await hitungUlangAtap({roof_analysis_id:paket.analisis.roof_analysis_id,asumsi:asumsiDenganWilayah(acuan.asumsi,wilayah,paket.bangunan,manual),parameter_fisika:acuan.parameter_fisika,usable_area_m2:Math.min(paket.analisis.usable_area_m2,areaSkenario(kapasitas,profil))});
    return <HasilAtap id={String(identitas)} bangunan={paket.bangunan} analisis={paket.analisis} simulasi={simulasi} pemindaian={paket} wilayah={wilayah}/>;
  } catch {
    if (tersimpan && !pilihan?.profil && !pilihan?.kwp) return <HasilAtap id={String(identitas)} {...tersimpan} pemindaian={paketContoh(identitas)} tersimpanOffline/>;
    return <KeadaanAtap jenis="galat" id={String(identitas)}/>;
  }
}
