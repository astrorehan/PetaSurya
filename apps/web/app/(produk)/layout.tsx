import type { ReactNode } from "react";
import { KerangkaProduk } from "@/components/KerangkaProduk";

export default function LayoutProduk({ children }: { children: ReactNode }) {
  return <KerangkaProduk>{children}</KerangkaProduk>;
}
