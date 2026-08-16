"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useUI } from "@/components/Providers";

export function CreateEventForm() {
  const { t } = useUI();
  const router = useRouter();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [visibility, setVisibility] = useState("public");

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setLoading(true);
    const fd = new FormData(e.currentTarget);
    const res = await fetch("/api/events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: fd.get("name"),
        purpose: fd.get("purpose"),
        target: fd.get("target") || null,
        visibility: fd.get("visibility"),
        adminPhone: fd.get("adminPhone"),
        coAdminPhone: fd.get("coAdminPhone") || null,
        viewerPhone: fd.get("viewerPhone") || null,
        adminPin: fd.get("adminPin") || null,
        viewPassword: fd.get("viewPassword") || null,
        collectUpiId: fd.get("collectUpiId") || null,
      }),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      setError(data.error || t.error);
      return;
    }
    router.push(`/e/${data.slug}`);
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="panel flex flex-col gap-3">
      <Field label={`${t.eventName} *`}>
        <input name="name" required placeholder="Ram Mandir Nirmaan Chanda 2026" className="input" />
      </Field>
      <Field label={t.purpose}>
        <textarea name="purpose" rows={2} className="input" />
      </Field>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label={t.targetOptional}>
          <input name="target" type="number" min={0} placeholder="500000" className="input" />
        </Field>
        <Field label={t.visibility}>
          <select
            name="visibility"
            className="input"
            value={visibility}
            onChange={(e) => setVisibility(e.target.value)}
          >
            <option value="public">{t.visibilityPublic}</option>
            <option value="private">{t.visibilityPrivate}</option>
          </select>
        </Field>
      </div>
      {visibility === "private" && (
        <Field label={`${t.viewPassword} *`}>
          <input name="viewPassword" required minLength={4} placeholder="****" className="input" />
        </Field>
      )}
      <Field label={t.collectUpi}>
        <input name="collectUpiId" placeholder="temple@upi" className="input" />
      </Field>
      <Field label={`${t.adminPhone} *`}>
        <input name="adminPhone" required pattern="[0-9]{10}" placeholder="9876543210" className="input" />
      </Field>
      <Field label={t.coAdminPhone}>
        <input name="coAdminPhone" pattern="[0-9]{10}" placeholder="9876543211" className="input" />
      </Field>
      <Field label={`${t.memberPhone} (${t.roleViewer})`}>
        <input name="viewerPhone" pattern="[0-9]{10}" placeholder="9876543212" className="input" />
      </Field>
      <Field label={t.adminPin}>
        <input name="adminPin" pattern="[0-9]{4,6}" placeholder="1234" className="input" />
      </Field>
      <p className="text-[0.85rem] text-[var(--muted)]">
        {t.adminPinHint} {visibility === "private" ? `· ${t.viewPasswordHint}` : ""}
      </p>
      {error && <p className="text-sm text-[var(--danger)]">{error}</p>}
      <button type="submit" disabled={loading} className="btn btn-primary w-full">
        {loading ? t.creating : t.createEvent}
      </button>
    </form>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[0.8rem] font-semibold text-[var(--muted)]">{label}</span>
      {children}
    </label>
  );
}
