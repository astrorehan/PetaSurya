import Link from "next/link";
import { ChevronDown } from "lucide-react";
import { Ikon, Logo } from "@petasurya/ui";
import s from "./chrome.module.css";

export function Footer({ engineVersion }: { engineVersion: string }) {
  return (
    <footer className={s.footer}>
      <div className={s.footerDalam}>
        <Link className={s.footerMerek} href="/" aria-label="PetaSurya, beranda"><Logo size={28} label="" /><span><b>PetaSurya<span className={s.titikMerek}>.</span></b><small>Atapmu, dihitung.</small></span></Link>
        <details className={s.footerDetails}>
          <summary>Versi hitungan <Ikon ikon={ChevronDown} /></summary>
          <p className={s.footerMeta}>{engineVersion}</p>
        </details>
        <Link href="/sumber-data">Sumber data</Link>
      </div>
    </footer>
  );
}
