"use client";

import Link from "next/link";
import { Topbar } from "@/components/Topbar";
import { useUI } from "@/components/Providers";
import { useEffect, useState } from "react";

export default function HomePage() {
  const { t, lang } = useUI();
  const [installEvent, setInstallEvent] = useState<{ prompt: () => Promise<void> } | null>(
    null
  );

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      const pe = e as Event & { prompt: () => Promise<void> };
      setInstallEvent({ prompt: () => pe.prompt() });
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  return (
    <>
      <Topbar />
      <section className="hero">
        <div className="hero-wash" aria-hidden />
        <h1 className="brand-mark">
          {lang === "hi" ? (
            <>
              साफ़
              <em>हिसाब</em>
            </>
          ) : (
            <>
              SAAF
              <em>Hisāb</em>
            </>
          )}
        </h1>
        <p className="hero-copy">{t.tagline}</p>
        <div className="hero-cta">
          <Link href="/events/new" className="btn btn-accent">
            {t.newEvent}
          </Link>
          <Link href="/events" className="btn btn-ghost">
            {t.seeEvents}
          </Link>
        </div>
        <div className="hero-rule" aria-hidden />
      </section>

      <div className="install-banner">
        <div>
          <strong>{t.installApp}</strong>
          <div className="muted text-[0.85rem]">{t.installHint}</div>
        </div>
        {installEvent ? (
          <button
            type="button"
            className="btn btn-primary btn-sm"
            onClick={() => installEvent.prompt()}
          >
            {t.installApp}
          </button>
        ) : (
          <span className="muted text-[0.8rem]">{t.installManual}</span>
        )}
      </div>

      <p className="mt-5 border-l-[3px] border-[var(--accent)] py-2 pl-4 text-[0.88rem] text-[var(--muted)]">
        {t.phaseNote}{" "}
        <Link href="/setup" className="font-semibold text-[var(--brand-deep)] underline">
          /setup
        </Link>
      </p>
    </>
  );
}
