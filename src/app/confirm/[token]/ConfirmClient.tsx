"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useUI } from "@/components/Providers";
import { rupee } from "@/lib/format";

export function ConfirmClient({
  token,
  initialAction,
}: {
  token: string;
  initialAction: string | null;
}) {
  const { t } = useUI();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [result, setResult] = useState<{
    status?: string;
    message?: string;
    pending?: boolean;
    contribution?: {
      name: string;
      amount: number;
      eventName?: string;
      event?: { name: string; slug: string };
    };
  } | null>(null);

  useEffect(() => {
    const q = initialAction ? `?a=${initialAction}` : "";
    fetch(`/api/confirm/${token}${q}`)
      .then(async (r) => {
        const data = await r.json();
        if (!r.ok) throw new Error(data.error || t.error);
        setResult(data);
      })
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, [token, initialAction, t.error]);

  if (loading) return <p className="text-[var(--muted)]">{t.loading}</p>;

  if (error) {
    return (
      <div className="panel">
        <p className="text-[var(--danger)]">{error}</p>
        <Link href="/" className="btn btn-ghost mt-3">
          {t.home}
        </Link>
      </div>
    );
  }

  if (result?.pending && result.contribution) {
    const c = result.contribution;
    const ask = t.confirmCashAsk
      .replace("{name}", c.name)
      .replace("{amount}", rupee(c.amount))
      .replace("{event}", c.eventName || "");
    return (
      <div className="panel">
        <h1 className="font-display text-[1.45rem]">{t.confirmCashTitle}</h1>
        <p className="mt-2 text-[var(--muted)]">{ask}</p>
        <div className="mt-4 flex flex-wrap gap-2">
          <a href={`/confirm/${token}?a=yes`} className="btn btn-primary">
            {t.yes}
          </a>
          <a href={`/confirm/${token}?a=no`} className="btn btn-ghost">
            {t.no}
          </a>
        </div>
      </div>
    );
  }

  const slug = result?.contribution?.event?.slug;
  const status = result?.status;

  return (
    <div className="panel text-center">
      <div
        className={`font-display mb-2 text-[1.8rem] ${
          status === "confirmed"
            ? "text-[var(--ok)]"
            : status === "rejected"
              ? "text-[var(--danger)]"
              : "text-[var(--ink)]"
        }`}
      >
        {status === "confirmed" ? t.success : status === "rejected" ? t.rejected : status}
      </div>
      <p>{result?.message}</p>
      {slug && (
        <Link href={`/e/${slug}`} className="btn btn-primary mt-4 inline-flex">
          {t.viewDashboard}
        </Link>
      )}
    </div>
  );
}
