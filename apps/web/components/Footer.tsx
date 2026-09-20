import Link from "next/link";
import s from "./chrome.module.css";

export function Footer({ engineVersion }: { engineVersion: string }) {
  return (
    <footer className={s.footer}>
      <div className={s.footerDalam}>
        <span className={s.footerMerek}>PetaSurya · Atapmu, dihitung.</span>
        <span className={s.footerMeta}>
          mesin <span className="num">{engineVersion}</span>
        </span>
        <Link href="/sumber-data">Sumber data</Link>
      </div>
    </footer>
  );
}
