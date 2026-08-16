"use client";

import Link from "next/link";
import { Topbar } from "@/components/Topbar";
import { useUI } from "@/components/Providers";

export default function HomePage() {
  const { t, lang } = useUI();

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

      <p className="mt-5 border-l-[3px] border-[var(--accent)] py-2 pl-4 text-[0.88rem] text-[var(--muted)]">
        {t.phaseNote}{" "}
        <Link href="/setup" className="font-semibold text-[var(--brand-deep)] underline">
          /setup
        </Link>
      </p>
    </>
  );
}
