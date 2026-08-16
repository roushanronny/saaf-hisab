"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { rupee } from "@/lib/format";
import { useUI } from "@/components/Providers";
import { downloadReceiptPdf } from "@/lib/export";
import { buildUpiPayUri } from "@/lib/event-helpers";

type Draft = {
  name: string;
  phone: string;
  village: string;
  father: string;
  amount: string;
};

type PublicConfig = {
  razorpayEnabled: boolean;
  razorpayKeyId: string | null;
  smsLive: boolean;
  smsProvider: string;
};

declare global {
  interface Window {
    Razorpay?: new (options: Record<string, unknown>) => {
      open: () => void;
      on: (event: string, handler: (resp: unknown) => void) => void;
    };
  }
}

function loadRazorpayScript() {
  return new Promise<boolean>((resolve) => {
    if (window.Razorpay) {
      resolve(true);
      return;
    }
    const s = document.createElement("script");
    s.src = "https://checkout.razorpay.com/v1/checkout.js";
    s.onload = () => resolve(true);
    s.onerror = () => resolve(false);
    document.body.appendChild(s);
  });
}

export function ContributeWizard({
  slug,
  eventName,
  collectUpiId,
}: {
  slug: string;
  eventName: string;
  collectUpiId?: string | null;
}) {
  const { t } = useUI();
  const [step, setStep] = useState(1);
  const [draft, setDraft] = useState<Draft>({
    name: "",
    phone: "",
    village: "",
    father: "",
    amount: "",
  });
  const [otpSessionId, setOtpSessionId] = useState("");
  const [otpHint, setOtpHint] = useState("");
  const [error, setError] = useState("");
  const [sms, setSms] = useState("");
  const [smsMeta, setSmsMeta] = useState("");
  const [receipt, setReceipt] = useState("");
  const [loading, setLoading] = useState(false);
  const [payMode, setPayMode] = useState<"UPI" | "Cash" | null>(null);
  const [config, setConfig] = useState<PublicConfig | null>(null);
  const [simulateId, setSimulateId] = useState<string | null>(null);
  const [simulateMsg, setSimulateMsg] = useState("");

  const steps = [t.details, t.otp, t.pay, t.done];

  const upiQrSrc = useMemo(() => {
    if (!collectUpiId || !draft.amount) return null;
    const uri = buildUpiPayUri({
      pa: collectUpiId,
      pn: eventName,
      am: Number(draft.amount) || undefined,
      tn: `${eventName} chanda`,
    });
    return `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(uri)}`;
  }, [collectUpiId, draft.amount, eventName]);

  useEffect(() => {
    fetch("/api/config")
      .then((r) => r.json())
      .then(setConfig)
      .catch(() => setConfig(null));
  }, []);

  async function submitDetails(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    const fd = new FormData(e.currentTarget);
    const phone = String(fd.get("phone")).trim();
    if (!/^\d{10}$/.test(phone)) {
      setError(t.invalidPhone);
      return;
    }
    const next: Draft = {
      name: String(fd.get("name")).trim(),
      phone,
      village: String(fd.get("village")).trim(),
      father: String(fd.get("father")).trim(),
      amount: String(fd.get("amount")),
    };
    setLoading(true);
    const res = await fetch("/api/otp/request", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone, purpose: "contribute" }),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      setError(data.error || t.error);
      return;
    }
    setDraft(next);
    setOtpSessionId(data.otpSessionId);
    setOtpHint(data.demoHint || "");
    setStep(2);
  }

  async function verifyOtp(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    const fd = new FormData(e.currentTarget);
    setLoading(true);
    const res = await fetch("/api/otp/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        otpSessionId,
        code: String(fd.get("otp")),
      }),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      setError(data.error || t.error);
      return;
    }
    setStep(3);
  }

  async function openUpi() {
    if (loading) return;
    setError("");
    setLoading(true);
    setPayMode("UPI");
    setSimulateId(null);

    const createRes = await fetch(`/api/events/${slug}/payments/create`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...draft,
        amount: Number(draft.amount),
        otpSessionId,
      }),
    });
    const created = await createRes.json();
    if (!createRes.ok) {
      setLoading(false);
      setError(created.error || t.error);
      return;
    }

    if (created.mode === "simulate") {
      setSimulateId(created.contributionId);
      setSimulateMsg(created.message || "");
      setReceipt(created.receiptNo || "");
      setLoading(false);
      return;
    }

    const ok = await loadRazorpayScript();
    if (!ok || !window.Razorpay) {
      setLoading(false);
      setError("Razorpay script load fail");
      return;
    }

    const rzp = new window.Razorpay({
      key: created.keyId,
      amount: Number(created.amount) * 100,
      currency: created.currency || "INR",
      name: created.name || "SAAF Hisāb",
      description: created.description || eventName,
      order_id: created.orderId,
      prefill: created.prefill || { name: draft.name, contact: draft.phone },
      handler: async (resp: unknown) => {
        const r = resp as {
          razorpay_order_id: string;
          razorpay_payment_id: string;
          razorpay_signature: string;
        };
        const verifyRes = await fetch("/api/payments/verify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contributionId: created.contributionId,
            razorpay_order_id: r.razorpay_order_id,
            razorpay_payment_id: r.razorpay_payment_id,
            razorpay_signature: r.razorpay_signature,
          }),
        });
        const data = await verifyRes.json();
        setLoading(false);
        if (!verifyRes.ok) {
          setError(data.error || t.error);
          return;
        }
        setReceipt(data.contribution.receiptNo);
        setSms(data.sms || "");
        setSmsMeta(data.smsSent ? `SMS (${data.smsProvider})` : `Preview (${data.smsProvider})`);
        setStep(4);
      },
    });
    rzp.on("payment.failed", () => {
      setLoading(false);
      setError(t.error);
    });
    rzp.open();
    setLoading(false);
  }

  async function finishSimulate() {
    if (!simulateId || loading) return;
    setError("");
    setLoading(true);
    const res = await fetch("/api/payments/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contributionId: simulateId, mode: "simulate" }),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      setError(data.error || t.error);
      return;
    }
    setReceipt(data.contribution.receiptNo);
    setSms(data.sms || "");
    setSmsMeta(data.smsSent ? `SMS (${data.smsProvider})` : `Preview (${data.smsProvider})`);
    setStep(4);
  }

  async function completeCash() {
    if (loading) return;
    setError("");
    setLoading(true);
    setPayMode("Cash");
    const res = await fetch(`/api/events/${slug}/contributions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...draft,
        mode: "Cash",
        amount: Number(draft.amount),
        otpSessionId,
      }),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      setError(data.error || t.error);
      return;
    }
    setReceipt(data.contribution.receiptNo);
    setSms(data.sms || "");
    setSmsMeta(
      data.smsSent
        ? `YES/NO SMS (${data.smsProvider})`
        : `Confirm preview (${data.smsProvider})`
    );
    if (data.confirmUrlYes) {
      setSms(
        `${data.sms || ""}\n\nYES: ${data.confirmUrlYes}\nNO: ${data.confirmUrlNo}`
      );
    }
    setStep(4);
  }

  return (
    <div>
      <h1 className="font-display text-[1.45rem]">{t.chandaTitle}</h1>
      <p className="mb-2 text-[0.95rem] text-[var(--muted)]">{eventName}</p>
      {config && (
        <p className="mb-4 text-[0.8rem] text-[var(--muted)]">
          Pay: {config.razorpayEnabled ? "Razorpay ON" : "Simulate"} · SMS:{" "}
          {config.smsLive ? config.smsProvider : "console"}
        </p>
      )}

      <div className="stepper">
        <div className="stepper-track">
          <div className="stepper-fill" style={{ width: `${(step / steps.length) * 100}%` }} />
        </div>
        <div className="stepper-labels">
          {steps.map((s, i) => {
            const n = i + 1;
            const cls = n < step ? "done" : n === step ? "on" : "";
            return (
              <span key={s} className={cls}>
                {n}. {s}
              </span>
            );
          })}
        </div>
      </div>

      <div className="panel">
        {step === 1 && (
          <form onSubmit={submitDetails} className="flex flex-col gap-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label={`${t.name} *`}>
                <input name="name" required defaultValue={draft.name} className="input" />
              </Field>
              <Field label={`${t.phone} *`}>
                <input
                  name="phone"
                  required
                  pattern="[0-9]{10}"
                  placeholder="10 digit"
                  defaultValue={draft.phone}
                  className="input"
                />
              </Field>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label={`${t.village} *`}>
                <input name="village" required defaultValue={draft.village} className="input" />
              </Field>
              <Field label={`${t.father} *`}>
                <input name="father" required defaultValue={draft.father} className="input" />
              </Field>
            </div>
            <Field label={`${t.amount} *`}>
              <input
                name="amount"
                type="number"
                min={1}
                required
                defaultValue={draft.amount}
                className="input"
              />
            </Field>
            {error && <p className="text-sm text-[var(--danger)]">{error}</p>}
            <button type="submit" disabled={loading} className="btn btn-primary w-full">
              {loading ? t.sendingOtp : t.sendOtp}
            </button>
          </form>
        )}

        {step === 2 && (
          <form onSubmit={verifyOtp} className="flex flex-col gap-3">
            <p className="text-[var(--muted)]">
              OTP → <strong className="text-[var(--ink)]">{draft.phone}</strong>
              {otpHint ? ` — ${otpHint}` : ""}
            </p>
            <Field label={`${t.otp} *`}>
              <input
                name="otp"
                required
                inputMode="numeric"
                maxLength={4}
                placeholder="----"
                className="input"
              />
            </Field>
            {error && <p className="text-sm text-[var(--danger)]">{error}</p>}
            <button type="submit" disabled={loading} className="btn btn-primary w-full">
              {loading ? t.verifying : t.verify}
            </button>
          </form>
        )}

        {step === 3 && (
          <div>
            <p className="mb-3.5">
              <strong>{draft.name}</strong> · {rupee(Number(draft.amount))} · {draft.village}
            </p>
            {upiQrSrc && (
              <div className="mb-4 text-center">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={upiQrSrc}
                  alt="UPI QR"
                  className="mx-auto rounded-[10px] border border-[var(--line)] bg-white"
                />
                <p className="mt-2 text-[0.85rem] text-[var(--muted)]">
                  {t.upiQrPay} · {collectUpiId}
                </p>
                <p className="mt-1 text-[0.8rem] text-[var(--muted)]">{t.upiQrHint}</p>
              </div>
            )}
            <div className="flex flex-wrap gap-2.5">
              <button type="button" className="btn btn-primary" disabled={loading} onClick={openUpi}>
                {loading && payMode === "UPI" && !simulateId ? t.loading : t.payUpi}
              </button>
              <button
                type="button"
                className="btn btn-ghost"
                disabled={loading}
                onClick={() => {
                  setPayMode("Cash");
                  setSimulateId(null);
                }}
              >
                {t.cashGiven}
              </button>
            </div>

            {payMode === "UPI" && simulateId && (
              <div className="mt-4 text-center">
                <div className="mx-auto mb-4 w-[220px] rounded-[28px] border border-[var(--line)] bg-[#101814] px-4 py-5 text-[#e8f5ef]">
                  <div className="text-[0.75rem] text-[#8fb5a6]">UPI</div>
                  <div className="font-display my-2.5 text-[2rem]">
                    {rupee(Number(draft.amount))}
                  </div>
                  <div className="text-[0.85rem] text-[#b7d4c8]">
                    {eventName} — {draft.name}
                  </div>
                </div>
                <p className="mb-3 text-[0.85rem] text-[var(--muted)]">{simulateMsg}</p>
                {error && <p className="mb-2 text-sm text-[var(--danger)]">{error}</p>}
                <button
                  type="button"
                  disabled={loading}
                  className="btn btn-accent w-full"
                  onClick={finishSimulate}
                >
                  {loading ? t.confirming : t.simulatePay}
                </button>
              </div>
            )}

            {payMode === "Cash" && (
              <div className="mt-4 flex flex-col gap-3">
                <p className="text-[0.85rem] text-[var(--muted)]">{t.cashToConfirm}</p>
                {error && <p className="text-sm text-[var(--danger)]">{error}</p>}
                <button
                  type="button"
                  disabled={loading}
                  className="btn btn-primary w-full"
                  onClick={completeCash}
                >
                  {loading ? t.saving : t.cashToConfirm}
                </button>
              </div>
            )}

            {error && payMode === "UPI" && !simulateId && (
              <p className="mt-3 text-sm text-[var(--danger)]">{error}</p>
            )}
          </div>
        )}

        {step === 4 && (
          <div>
            <div className="py-2 text-center">
              <div className="font-display mb-2 text-[1.8rem] text-[var(--ok)]">
                {payMode === "Cash" ? t.awaitingYes : t.success}
              </div>
              <p>
                Receipt {receipt}
                {smsMeta ? ` · ${smsMeta}` : ""}
              </p>
            </div>
            {sms && (
              <div className="mt-3.5 whitespace-pre-wrap rounded-xl bg-[#0f1f19] p-3.5 text-[0.9rem] text-[#d7ebe2]">
                <div className="mb-2 text-[0.75rem] uppercase tracking-wide text-[#7ebda8]">
                  SMS → {draft.phone}
                </div>
                {sms}
              </div>
            )}
            <div className="mt-4 flex flex-wrap gap-2.5">
              <Link href={`/e/${slug}`} className="btn btn-primary">
                {t.viewDashboard}
              </Link>
              {payMode !== "Cash" && (
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={() =>
                    downloadReceiptPdf({
                      receiptNo: receipt,
                      name: draft.name,
                      amount: Number(draft.amount),
                      eventName,
                      phone: draft.phone,
                      mode: payMode || "UPI",
                      sms,
                    })
                  }
                >
                  {t.downloadReceipt}
                </button>
              )}
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => {
                  setStep(1);
                  setPayMode(null);
                  setSimulateId(null);
                  setSms("");
                  setSmsMeta("");
                  setError("");
                }}
              >
                {t.moreChanda}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
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
