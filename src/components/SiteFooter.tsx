"use client";

import Link from "next/link";
import { useUI } from "@/components/Providers";

export function SiteFooter() {
  const { t } = useUI();
  return (
    <footer className="site-footer">
      <span>{t.madeBy}</span>
      <span className="site-footer__sep" aria-hidden>
        ·
      </span>
      <Link href="/install" className="site-footer__link">
        {t.installApp}
      </Link>
    </footer>
  );
}
