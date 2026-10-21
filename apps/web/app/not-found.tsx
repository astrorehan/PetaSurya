import { KerangkaProduk } from "@/components/KerangkaProduk";
import { TidakDitemukan } from "@/components/TidakDitemukan";

// Alamat yang tidak cocok dengan rute mana pun dirender di luar grup (produk).
export default function TidakDitemukanAkar() {
  return <KerangkaProduk><TidakDitemukan /></KerangkaProduk>;
}
