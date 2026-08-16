"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useUI } from "@/components/Providers";

export function Topbar({ pill }: { pill?: string }) {
  const { t, lang, setLang, theme, toggleTheme } = useUI();
  const pathname = usePathname();
  const onSetup = pathname === "/setup" || pathname?.startsWith("/setup/");
  const onInstall = pathname === "/install" || pathname?.startsWith("/install/");

  return (
    <header className="topbar">
      <Link href="/" className="logo">
        {lang === "hi" ? (
          <>
            साफ़ <span>हिसाब</span>
          </>
        ) : (
          <>
            SAAF <span>Hisāb</span>
          </>
        )}
      </Link>
      <div className="topbar-actions">
        <div className="seg" role="group" aria-label={t.language}>
          <button
            type="button"
            className={lang === "hi" ? "on" : ""}
            onClick={() => setLang("hi")}
          >
            हिं
          </button>
          <button
            type="button"
            className={lang === "en" ? "on" : ""}
            onClick={() => setLang("en")}
          >
            EN
          </button>
        </div>
        <button type="button" className="icon-btn" onClick={toggleTheme} title={t.theme}>
          {theme === "light" ? "◐" : "◑"}
        </button>
        {!onSetup && !onInstall && (
          <Link href="/install" className="pill">
            {t.installApp}
          </Link>
        )}
        {!onSetup && (
          <Link href="/setup" className="pill subtle">
            {t.setup}
          </Link>
        )}
        {pill && !onSetup ? <span className="pill">{pill}</span> : null}
      </div>
    </header>
  );
}

export function BackLink({ href, label }: { href: string; label?: string }) {
  const { t } = useUI();
  return (
    <Link href={href} className="back-link">
      ← {label || t.back}
    </Link>
  );
}
