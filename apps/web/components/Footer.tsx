import Link from "next/link";
import { ChevronDown } from "lucide-react";
import { Ikon } from "@petasurya/ui";
import s from "./chrome.module.css";

export function Footer({ engineVersion }: { engineVersion: string }) {
  return (
    <footer className={s.footer}>
      <div className={s.footerDalam}>
        <span className={s.footerMerek}>PetaSurya · Atapmu, dihitung.</span>
        <details className={s.footerDetails}>
          <summary>Versi hitungan <Ikon ikon={ChevronDown} /></summary>
          <p className={s.footerMeta}>{engineVersion}</p>
        </details>
        <Link href="/sumber-data">Sumber data</Link>
      </div>
    </footer>
  );
}
