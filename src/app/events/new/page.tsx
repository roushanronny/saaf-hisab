"use client";

import { CreateEventForm } from "@/components/CreateEventForm";
import { BackLink, Topbar } from "@/components/Topbar";
import { useUI } from "@/components/Providers";

export default function NewEventPage() {
  const { t } = useUI();
  return (
    <>
      <Topbar />
      <BackLink href="/events" label={t.events} />
      <h1 className="font-display text-[1.45rem] tracking-tight">{t.newEventTitle}</h1>
      <p className="mb-4 text-[0.95rem] text-[var(--muted)]">{t.newEventSub}</p>
      <CreateEventForm />
    </>
  );
}
