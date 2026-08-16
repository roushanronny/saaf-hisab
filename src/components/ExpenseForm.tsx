"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useUI } from "@/components/Providers";

export function ExpenseForm({
  slug,
  coAdminPhone,
  hasAdminPin,
}: {
  slug: string;
  coAdminPhone?: string | null;
  hasAdminPin?: boolean;
}) {
  const { t } = useUI();
  const router = useRouter();
  const [mode, setMode] = useState("UPI");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [gps, setGps] = useState("");
  const [photoData, setPhotoData] = useState("");
  const [photoPreview, setPhotoPreview] = useState("");
  const [pinOk, setPinOk] = useState(!hasAdminPin);

  useEffect(() => {
    if (!hasAdminPin) return;
    if (sessionStorage.getItem(`saaf_pin_ok_${slug}`) === "1") {
      setPinOk(true);
      return;
    }
    const pin = window.prompt(t.enterPin);
    if (!pin) {
      setError(t.pinRequired);
      return;
    }
    fetch(`/api/events/${slug}/verify-pin`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pin }),
    })
      .then(async (r) => {
        const data = await r.json();
        if (!r.ok || !data.ok) throw new Error(data.error || t.wrongPin);
        sessionStorage.setItem(`saaf_pin_ok_${slug}`, "1");
        setPinOk(true);
      })
      .catch((e: Error) => setError(e.message));
  }, [hasAdminPin, slug, t.enterPin, t.pinRequired, t.wrongPin]);

  useEffect(() => {
    if (mode !== "Cash") return;
    if (!navigator.geolocation) {
      setGps("GPS unsupported");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setGps(`${pos.coords.latitude.toFixed(5)}°N, ${pos.coords.longitude.toFixed(5)}°E`);
      },
      () => setGps("GPS denied / unavailable"),
      { enableHighAccuracy: true, timeout: 8000 }
    );
  }, [mode]);

  function onPhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const data = String(reader.result || "");
      if (data.length > 900_000) {
        setError("Photo too large");
        return;
      }
      setPhotoData(data);
      setPhotoPreview(data);
      setError("");
    };
    reader.readAsDataURL(file);
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!pinOk) {
      setError(t.pinRequired);
      return;
    }
    setError("");
    setLoading(true);
    const fd = new FormData(e.currentTarget);
    const res = await fetch(`/api/events/${slug}/expenses`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        item: fd.get("item"),
        vendor: fd.get("vendor"),
        vendorUpi: fd.get("vendorUpi"),
        amount: fd.get("amount"),
        mode: fd.get("mode"),
        category: fd.get("category"),
        billNote: fd.get("billNote"),
        billPhotoData: photoData || null,
        gps,
      }),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      setError(data.error || t.error);
      return;
    }
    router.push(`/e/${slug}`);
    router.refresh();
  }

  if (hasAdminPin && !pinOk) {
    return (
      <div className="panel">
        <p className="text-[var(--danger)]">{error || t.pinRequired}</p>
        <button type="button" className="btn btn-primary mt-3" onClick={() => location.reload()}>
          {t.retryPin}
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="panel flex flex-col gap-3">
      <Field label={`${t.itemWork} *`}>
        <input name="item" required placeholder="Tent & lighting" className="input" />
      </Field>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label={`${t.vendorName} *`}>
          <input name="vendor" required placeholder="Sharma Tent House" className="input" />
        </Field>
        <Field label={`${t.amount} *`}>
          <input name="amount" type="number" min={1} required placeholder="2500" className="input" />
        </Field>
      </div>
      <Field label={t.category}>
        <select name="category" className="input" defaultValue="misc">
          <option value="tent">{t.catTent}</option>
          <option value="prasad">{t.catPrasad}</option>
          <option value="sound">{t.catSound}</option>
          <option value="lighting">{t.catLighting}</option>
          <option value="decoration">{t.catDecoration}</option>
          <option value="transport">{t.catTransport}</option>
          <option value="misc">{t.catMisc}</option>
        </select>
      </Field>
      <Field label={`${t.paymentMode} *`}>
        <select name="mode" className="input" value={mode} onChange={(e) => setMode(e.target.value)}>
          <option value="UPI">{t.modeUpi}</option>
          <option value="Cash">{t.modeCash}</option>
        </select>
      </Field>

      {mode === "UPI" ? (
        <>
          <Field label={`${t.vendorUpi} *`}>
            <input name="vendorUpi" required placeholder="vendor@upi" className="input" />
          </Field>
          <p className="text-[0.85rem] text-[var(--muted)]">
            {coAdminPhone ? `Co-admin: ${coAdminPhone}` : ""}
          </p>
        </>
      ) : (
        <>
          <Field label={t.billPhoto}>
            <input type="file" accept="image/*" capture="environment" className="input" onChange={onPhoto} />
          </Field>
          {photoPreview && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={photoPreview} alt="Bill" className="max-h-40 rounded-xl border border-[var(--line)] object-contain" />
          )}
          <Field label={t.billNote}>
            <input name="billNote" className="input" />
          </Field>
          <p className="text-[0.85rem] text-[var(--muted)]">GPS: {gps || "…"}</p>
        </>
      )}

      {error && <p className="text-sm text-[var(--danger)]">{error}</p>}
      <button type="submit" disabled={loading} className="btn btn-primary w-full">
        {loading ? t.saving : t.saveExpense}
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
