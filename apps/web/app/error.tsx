"use client";

import { GalatHalaman } from "@/components/GalatHalaman";
import { KerangkaProduk } from "@/components/KerangkaProduk";

// Galat di luar ruang kerja (halaman pengenalan) tetap diberi navigasi produk.
export default function GalatAkar({ reset }: { reset: () => void }) {
  return <KerangkaProduk><GalatHalaman reset={reset} /></KerangkaProduk>;
}
