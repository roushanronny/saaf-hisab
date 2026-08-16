"use client";

import Link from "next/link";
import { BackLink, Topbar } from "@/components/Topbar";
import { useUI } from "@/components/Providers";
import { rupee } from "@/lib/format";
import { useEffect, useState } from "react";

type EventRow = {
  id: string;
  slug: string;
  name: string;
  purpose: string | null;
  visibility: string;
  collected: number;
  spent: number;
  balance: number;
};

export default function EventsPage() {
  const { t } = useUI();
  const [events, setEvents] = useState<EventRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/events")
      .then(async (r) => {
        const data = await r.json();
        if (!r.ok) throw new Error(data.error || "Fail");
        setEvents(data);
      })
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  return (
    <>
      <Topbar />
      <BackLink href="/" label={t.home} />
      <h1 className="font-display text-[1.45rem] tracking-tight">{t.events}</h1>
      <p className="mb-4 text-[0.95rem] text-[var(--muted)]">{t.eventsSub}</p>

      {loading && <p className="muted">{t.loading}</p>}
      {error && <p className="text-[var(--danger)]">{error}</p>}

      {!loading && !error && (
        <div className="flex flex-col gap-2.5">
          {events.length === 0 && (
            <div className="empty-box panel">
              <p>{t.emptyEvents}</p>
              <Link href="/events/new" className="btn btn-accent btn-sm">
                {t.newEvent}
              </Link>
            </div>
          )}
          {events.map((ev) => (
            <Link key={ev.id} href={`/e/${ev.slug}`} className="event-row">
              <div className="event-row-top">
                <div>
                  <h2 className="font-display text-[1.2rem]">{ev.name}</h2>
                  {ev.purpose && (
                    <p className="mt-1 text-[0.9rem] text-[var(--muted)]">{ev.purpose}</p>
                  )}
                </div>
                <span className="balance-chip">{rupee(ev.balance)}</span>
              </div>
              <p className="mt-2 text-[0.85rem] text-[var(--muted)]">
                {t.collected} {rupee(ev.collected)} · {t.spent} {rupee(ev.spent)}
              </p>
            </Link>
          ))}
        </div>
      )}

      {events.length > 0 && (
        <div className="mt-4">
          <Link href="/events/new" className="btn btn-primary">
            + {t.newEvent}
          </Link>
        </div>
      )}
    </>
  );
}
