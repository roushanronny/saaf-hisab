"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { BackLink, Topbar } from "@/components/Topbar";
import { useUI } from "@/components/Providers";

type Status = {
  items: Record<string, { done: boolean; detail: string }>;
  appUrl: string;
  webhookUrl: string;
  canWriteEnv: boolean;
  isVercel?: boolean;
  vercelEnvUrl?: string;
  demoMode?: boolean;
};

export function SetupClient() {
  const { t } = useUI();
  const [status, setStatus] = useState<Status | null>(null);
  const [showLater, setShowLater] = useState(false);

  const labels: Record<string, string> = {
    razorpayUpi: t.setupLabelRzp,
    otpSms: t.setupLabelOtp,
    receiptSms: t.setupLabelReceipt,
    webhook: t.setupLabelWebhook,
  };

  useEffect(() => {
    fetch("/api/setup")
      .then((r) => r.json())
      .then(setStatus)
      .catch(() => setStatus(null));
  }, []);

  const demoMode = status?.demoMode ?? true;

  const vercelUrl =
    status?.vercelEnvUrl ||
    "https://vercel.com/roushan-kumars-projects-97d60324/saaf-hisab/settings/environment-variables";

  return (
    <>
      <Topbar />
      <BackLink href="/" label={t.home} />

      <h1 className="font-display text-[1.45rem] tracking-tight">{t.setupTitle}</h1>
      <p className="mb-4 text-[0.95rem] text-[var(--muted)]">{t.setupIntro}</p>

      {demoMode && (
        <div className="demo-banner mb-4">
          <strong>{t.setupDemoOk}</strong>
          <p className="mt-1 text-[0.9rem]">{t.setupDemoBanner}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Link href="/events" className="btn btn-accent btn-sm">
              {t.seeEvents}
            </Link>
            <Link href="/events/new" className="btn btn-ghost btn-sm">
              {t.newEvent}
            </Link>
          </div>
        </div>
      )}

      <div className="panel mb-4">
        <h2 className="font-display mb-3 text-lg">{t.setupStatus}</h2>
        {status ? (
          <ul className="space-y-2">
            {Object.entries(status.items).map(([k, v]) => (
              <li
                key={k}
                className="flex items-start justify-between gap-3 border-b border-[var(--line)] py-2 last:border-0"
              >
                <div>
                  <strong>{labels[k] || k}</strong>
                  <div className="text-[0.85rem] text-[var(--muted)]">{v.detail}</div>
                </div>
                <span
                  className={
                    v.done
                      ? "font-semibold text-[var(--ok)]"
                      : "font-semibold text-[var(--muted)]"
                  }
                >
                  {v.done ? t.setupDone : t.setupPending}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-[var(--muted)]">{t.loading}</p>
        )}
      </div>

      <div className="panel mb-4">
        <button
          type="button"
          className="flex w-full items-center justify-between gap-2 text-left"
          onClick={() => setShowLater((s) => !s)}
        >
          <h2 className="font-display text-lg">{t.setupHow}</h2>
          <span className="text-[var(--muted)]">{showLater ? "−" : "+"}</span>
        </button>

        {showLater && (
          <>
            <ol className="mt-3 list-decimal space-y-2 pl-5 text-[0.95rem] text-[var(--muted)]">
              <li>
                <a
                  className="font-semibold text-[var(--brand)] underline"
                  href="https://dashboard.razorpay.com/app/keys"
                  target="_blank"
                  rel="noreferrer"
                >
                  Razorpay
                </a>{" "}
                (Test) → Key ID + Secret
              </li>
              <li>
                <a
                  className="font-semibold text-[var(--brand)] underline"
                  href="https://control.msg91.com/signin/"
                  target="_blank"
                  rel="noreferrer"
                >
                  MSG91
                </a>{" "}
                → Auth Key
              </li>
              <li>
                <a
                  className="font-semibold text-[var(--brand)] underline"
                  href={vercelUrl}
                  target="_blank"
                  rel="noreferrer"
                >
                  Vercel Env
                </a>
                <ul className="mt-2 list-disc pl-5 font-mono text-[0.8rem] text-[var(--ink)]">
                  <li>RAZORPAY_KEY_ID</li>
                  <li>RAZORPAY_KEY_SECRET</li>
                  <li>MSG91_AUTH_KEY</li>
                  <li>MSG91_SENDER_ID = SAAFHB</li>
                  <li>RAZORPAY_WEBHOOK_SECRET</li>
                </ul>
              </li>
              <li>
                Webhook:{" "}
                <code className="text-[var(--ink)]">
                  {status?.webhookUrl || "…/api/webhooks/razorpay"}
                </code>
              </li>
              <li>Vercel → Redeploy</li>
              <li>{t.setupStepRefresh}</li>
            </ol>
            <div className="mt-4 flex flex-wrap gap-2">
              <a className="btn btn-primary" href={vercelUrl} target="_blank" rel="noreferrer">
                {t.setupOpenVercel}
              </a>
            </div>
          </>
        )}
      </div>

      <div className="border-l-[3px] border-[var(--ok)] py-3 pl-4 text-[0.9rem] text-[var(--muted)]">
        {t.setupHint}
      </div>

      {status?.canWriteEnv && <LocalDevForm onSaved={() => location.reload()} />}
    </>
  );
}

function LocalDevForm({ onSaved }: { onSaved: () => void }) {
  const { t } = useUI();
  const [form, setForm] = useState({
    RAZORPAY_KEY_ID: "",
    RAZORPAY_KEY_SECRET: "",
    RAZORPAY_WEBHOOK_SECRET: "",
    MSG91_AUTH_KEY: "",
    MSG91_SENDER_ID: "SAAFHB",
  });
  const [err, setErr] = useState("");
  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(false);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setErr("");
    const res = await fetch("/api/setup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      setErr(data.error || t.error);
      return;
    }
    setMsg(data.note);
    onSaved();
  }

  return (
    <form onSubmit={save} className="panel mt-4 flex flex-col gap-3">
      <h2 className="font-display text-lg">Local — .env (optional)</h2>
      {(
        [
          ["RAZORPAY_KEY_ID", "rzp_test_…"],
          ["RAZORPAY_KEY_SECRET", "secret"],
          ["RAZORPAY_WEBHOOK_SECRET", "webhook secret"],
          ["MSG91_AUTH_KEY", "auth key"],
          ["MSG91_SENDER_ID", "SAAFHB"],
        ] as const
      ).map(([k, ph]) => (
        <label key={k} className="block">
          <span className="mb-1.5 block text-[0.8rem] font-semibold text-[var(--muted)]">{k}</span>
          <input
            className="input"
            placeholder={ph}
            value={form[k]}
            onChange={(e) => setForm({ ...form, [k]: e.target.value })}
            type={k.includes("SECRET") || k.includes("AUTH") ? "password" : "text"}
          />
        </label>
      ))}
      {err && <p className="text-sm text-[var(--danger)]">{err}</p>}
      {msg && <p className="text-sm text-[var(--ok)]">{msg}</p>}
      <button type="submit" disabled={loading} className="btn btn-primary w-full">
        {loading ? t.saving : t.save}
      </button>
    </form>
  );
}
