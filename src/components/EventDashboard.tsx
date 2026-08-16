"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { formatWhen, rupee } from "@/lib/format";
import { useUI } from "@/components/Providers";
import {
  downloadEventReportPdf,
  exportDonorsCsv,
  exportExpensesCsv,
} from "@/lib/export";
import { thankYouWhatsAppText } from "@/lib/event-helpers";

type Contribution = {
  id: string;
  name: string;
  phone: string;
  village: string;
  father: string;
  amount: number;
  mode: string;
  status: string;
  receiptNo?: string;
  confirmToken?: string | null;
  createdAt: string;
};

type Flag = {
  id: string;
  byName: string;
  comment: string;
  status: string;
  createdAt: string;
};

type Expense = {
  id: string;
  item: string;
  vendor: string;
  vendorUpi: string | null;
  amount: number;
  mode: string;
  category?: string | null;
  approved: boolean;
  needsApproval: boolean;
  billNote: string | null;
  billPhotoData: string | null;
  gps: string | null;
  approvedByPhone: string | null;
  createdAt: string;
  flags: Flag[];
};

type Member = { id: string; phone: string; name: string | null; role: string };
type Photo = {
  id: string;
  caption: string | null;
  dataUrl: string;
  kind: string;
  createdAt: string;
};
type Activity = {
  id: string;
  action: string;
  detail: string | null;
  actorPhone: string | null;
  actorName: string | null;
  createdAt: string;
};

type EventPayload = {
  slug: string;
  name: string;
  purpose: string | null;
  target: number | null;
  visibility: string;
  adminPhone: string;
  coAdminPhone: string | null;
  hasAdminPin: boolean;
  hasViewPassword: boolean;
  locked?: boolean;
  collectUpiId: string | null;
  collected: number;
  spent: number;
  balance: number;
  contributions: Contribution[];
  expenses: Expense[];
  members: Member[];
  photos: Photo[];
  activityLogs: Activity[];
};

export function EventDashboard({ event }: { event: EventPayload }) {
  const { t } = useUI();
  const router = useRouter();
  const [tab, setTab] = useState<
    "donors" | "expenses" | "timeline" | "gallery" | "activity" | "members"
  >("donors");
  const [busy, setBusy] = useState("");
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");
  const [search, setSearch] = useState("");
  const [share, setShare] = useState(`/e/${event.slug}`);
  const [contributeUrl, setContributeUrl] = useState(`/e/${event.slug}/contribute`);
  const [adminPinSession, setAdminPinSession] = useState(false);
  const [unlocked, setUnlocked] = useState(!event.hasViewPassword && !event.locked);
  const [pw, setPw] = useState("");
  const [photos, setPhotos] = useState(event.photos.filter((p) => p.kind === "gallery"));
  const [members, setMembers] = useState(event.members);
  const [caption, setCaption] = useState("");
  const [photoBusy, setPhotoBusy] = useState(false);

  useEffect(() => {
    const origin = window.location.origin;
    setShare(`${origin}/e/${event.slug}`);
    setContributeUrl(`${origin}/e/${event.slug}/contribute`);
    if (sessionStorage.getItem(`saaf_pin_ok_${event.slug}`) === "1") {
      setAdminPinSession(true);
    }
    if (!event.locked && event.hasViewPassword) {
      setUnlocked(true);
    }
    if (event.locked) setUnlocked(false);
  }, [event.slug, event.hasViewPassword, event.locked]);

  const qrSrc = useMemo(() => {
    return `https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encodeURIComponent(contributeUrl)}`;
  }, [contributeUrl]);

  const targetPct = useMemo(() => {
    if (!event.target || event.target <= 0) return null;
    return Math.min(100, Math.round((event.collected / event.target) * 100));
  }, [event.collected, event.target]);

  const filteredDonors = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return event.contributions;
    return event.contributions.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.phone.includes(q) ||
        c.village.toLowerCase().includes(q) ||
        c.father.toLowerCase().includes(q)
    );
  }, [event.contributions, search]);

  const timeline = useMemo(() => {
    const items = [
      ...event.contributions
        .filter((c) => c.status === "confirmed")
        .map((c) => ({
          at: c.createdAt,
          kind: "in" as const,
          text: `${c.name} · ${rupee(c.amount)} (${c.mode})`,
        })),
      ...event.expenses
        .filter((x) => x.approved)
        .map((x) => ({
          at: x.createdAt,
          kind: "out" as const,
          text: `${x.item}${x.category ? ` [${x.category}]` : ""} — ${x.vendor} · ${rupee(x.amount)}`,
        })),
    ];
    return items.sort((a, b) => (a.at < b.at ? 1 : -1));
  }, [event]);

  const catLabel = (c?: string | null) => {
    const map: Record<string, string> = {
      tent: t.catTent,
      prasad: t.catPrasad,
      sound: t.catSound,
      lighting: t.catLighting,
      decoration: t.catDecoration,
      transport: t.catTransport,
      misc: t.catMisc,
    };
    return c ? map[c] || c : "—";
  };

  async function unlock(e: React.FormEvent) {
    e.preventDefault();
    setErr("");
    setMsg("");
    const res = await fetch(`/api/events/${event.slug}/verify-password`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password: pw }),
    });
    const data = await res.json();
    if (!res.ok || !data.ok) {
      setErr(data.error || t.error);
      return;
    }
    setUnlocked(true);
    router.refresh();
  }

  function flashOk(message: string) {
    setErr("");
    setMsg(message);
  }

  function flashErr(message: string) {
    setMsg("");
    setErr(message);
  }

  async function ensurePin(): Promise<boolean> {
    if (!event.hasAdminPin || adminPinSession) return true;
    const pin = window.prompt(t.enterPin);
    if (!pin) return false;
    const res = await fetch(`/api/events/${event.slug}/verify-pin`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pin }),
    });
    const data = await res.json();
    if (!res.ok || !data.ok) {
      flashErr(data.error || t.wrongPin);
      return false;
    }
    sessionStorage.setItem(`saaf_pin_ok_${event.slug}`, "1");
    setAdminPinSession(true);
    return true;
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(share);
      flashOk(t.copied);
    } catch {
      flashOk(share);
    }
  }

  function shareWhatsApp() {
    window.open(
      `https://wa.me/?text=${encodeURIComponent(`${event.name}\n${share}`)}`,
      "_blank",
      "noopener,noreferrer"
    );
  }

  function doExport() {
    exportDonorsCsv(event.name, event.contributions);
    exportExpensesCsv(event.name, event.expenses);
    flashOk(t.exportExcel);
  }

  function doReport() {
    downloadEventReportPdf({
      eventName: event.name,
      purpose: event.purpose,
      collected: event.collected,
      spent: event.spent,
      balance: event.balance,
      target: event.target,
      donors: event.contributions,
      expenses: event.expenses,
    });
  }

  function thankYou(c: Contribution) {
    const text = thankYouWhatsAppText({
      name: c.name,
      amount: c.amount,
      eventName: event.name,
      receiptNo: c.receiptNo,
      eventUrl: share,
    });
    window.open(
      `https://wa.me/91${c.phone}?text=${encodeURIComponent(text)}`,
      "_blank",
      "noopener,noreferrer"
    );
  }

  async function remind(c: Contribution, via: "sms" | "whatsapp") {
    if (!(await ensurePin())) return;
    setBusy(c.id);
    flashOk("");
    flashErr("");
    const res = await fetch(`/api/events/${event.slug}/contributions/${c.id}/remind`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ via: via === "whatsapp" ? "both" : "sms" }),
    });
    const data = await res.json();
    setBusy("");
    if (!res.ok) {
      flashErr(data.error || t.error);
      return;
    }
    flashOk(t.remindSent);
    if (via === "whatsapp" && data.waUrl) {
      window.open(data.waUrl, "_blank", "noopener,noreferrer");
    }
  }

  async function approveExpense(id: string) {
    if (!(await ensurePin())) return;
    const coAdminPhone = window.prompt(
      event.coAdminPhone
        ? `Co-admin phone (${event.coAdminPhone})`
        : "Admin / co-admin phone (10 digit)"
    );
    if (!coAdminPhone) return;
    setBusy(id);
    flashErr("");
    const res = await fetch(`/api/events/${event.slug}/expenses/${id}/approve`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ coAdminPhone }),
    });
    const data = await res.json();
    setBusy("");
    if (!res.ok) {
      flashErr(data.error || t.error);
      return;
    }
    flashOk(t.approved);
    router.refresh();
  }

  async function flagExpense(id: string) {
    const byName = window.prompt("Name");
    const byPhone = window.prompt("Phone (10 digit)");
    const comment = window.prompt("Comment");
    if (!byName || !byPhone || !comment) return;
    setBusy(id);
    const res = await fetch(`/api/events/${event.slug}/expenses/${id}/flag`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ byName, byPhone, comment }),
    });
    const data = await res.json();
    setBusy("");
    if (!res.ok) {
      flashErr(data.error || t.error);
      return;
    }
    flashOk(t.flagDispute);
    router.refresh();
  }

  async function onPhotoFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!(await ensurePin())) {
      e.target.value = "";
      return;
    }
    setPhotoBusy(true);
    const input = e.target;
    const reader = new FileReader();
    reader.onerror = () => {
      setPhotoBusy(false);
      flashErr(t.error);
    };
    reader.onload = async () => {
      try {
        const dataUrl = String(reader.result || "");
        const res = await fetch(`/api/events/${event.slug}/photos`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ dataUrl, caption }),
        });
        const data = await res.json();
        if (!res.ok) {
          flashErr(data.error || t.error);
          return;
        }
        setPhotos((p) => [data, ...p]);
        setCaption("");
        flashOk(t.success);
      } catch {
        flashErr(t.error);
      } finally {
        setPhotoBusy(false);
        input.value = "";
      }
    };
    reader.readAsDataURL(file);
  }

  async function addMember(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!(await ensurePin())) return;
    const fd = new FormData(e.currentTarget);
    const actorPhone = window.prompt(`${t.adminPhone} (${event.adminPhone})`);
    if (!actorPhone) return;
    setBusy("member");
    const res = await fetch(`/api/events/${event.slug}/members`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        phone: fd.get("phone"),
        name: fd.get("name"),
        role: fd.get("role"),
        actorPhone,
      }),
    });
    const data = await res.json();
    setBusy("");
    if (!res.ok) {
      flashErr(data.error || t.error);
      return;
    }
    setMembers((m) => {
      const rest = m.filter((x) => x.phone !== data.phone);
      return [...rest, data];
    });
    flashOk(t.success);
    (e.target as HTMLFormElement).reset();
  }

  if (!unlocked) {
    return (
      <form onSubmit={unlock} className="panel max-w-md">
        <h1 className="font-display text-[1.35rem]">{event.name}</h1>
        <p className="mt-2 text-[0.9rem] text-[var(--muted)]">{t.enterViewPassword}</p>
        <input
          type="password"
          className="input mt-3"
          value={pw}
          onChange={(e) => setPw(e.target.value)}
          required
          minLength={4}
        />
        {err && <p className="mt-2 text-sm text-[var(--danger)]">{err}</p>}
        <button type="submit" className="btn btn-accent mt-3 w-full">
          {t.unlock}
        </button>
      </form>
    );
  }

  return (
    <div>
      <h1 className="font-display text-[1.55rem] tracking-tight">{event.name}</h1>
      <p className="mt-1 text-[0.95rem] text-[var(--muted)]">
        {event.purpose || "—"}
        {event.target ? ` · ${t.target} ${rupee(event.target)}` : ""}
        {event.hasAdminPin ? " · PIN" : ""}
        {event.visibility === "private" ? " · 🔒" : ""}
      </p>

      <div className="share-bar">
        <code>{share}</code>
        <button type="button" className="btn btn-ghost btn-sm" onClick={copyLink}>
          {t.copyLink}
        </button>
        <button type="button" className="btn btn-accent btn-sm" onClick={shareWhatsApp}>
          {t.shareWhatsApp}
        </button>
        <button type="button" className="btn btn-ghost btn-sm" onClick={doExport}>
          {t.exportExcel}
        </button>
        <button type="button" className="btn btn-ghost btn-sm" onClick={doReport}>
          {t.reportPdf}
        </button>
      </div>

      <div className="ledger">
        <div className="ledger-balance">
          <div className="label">{t.balance}</div>
          <div className="value">{rupee(event.balance)}</div>
        </div>
        <div className="ledger-row">
          <div className="ledger-cell">
            <div className="label">{t.collected}</div>
            <div className="value" style={{ color: "var(--ok)" }}>
              {rupee(event.collected)}
            </div>
          </div>
          <div className="ledger-cell">
            <div className="label">{t.spent}</div>
            <div className="value" style={{ color: "var(--warn)" }}>
              {rupee(event.spent)}
            </div>
          </div>
        </div>
      </div>

      {targetPct !== null && event.target && (
        <div className="progress-card">
          <div className="progress-head">
            <span>{t.targetProgress}</span>
            <strong>
              {rupee(event.collected)} / {rupee(event.target)} · {targetPct}%
            </strong>
          </div>
          <div className="progress-track">
            <div className="progress-fill" style={{ width: `${targetPct}%` }} />
          </div>
        </div>
      )}

      {(msg || err) && (
        <p className={`toast-inline ${err ? "err" : "ok"}`}>{err || msg}</p>
      )}

      <div className="dash-actions">
        <div className="cta-group">
          <Link href={`/e/${event.slug}/contribute`} className="btn btn-accent">
            {t.contribute}
          </Link>
          <Link
            href={`/e/${event.slug}/expense`}
            className="btn btn-ghost"
            onClick={async (e) => {
              if (event.hasAdminPin && !adminPinSession) {
                e.preventDefault();
                if (await ensurePin()) router.push(`/e/${event.slug}/expense`);
              }
            }}
          >
            {t.addExpense}
          </Link>
        </div>
        <div className="qr-box">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={qrSrc} alt="QR" />
          <span className="text-[0.75rem] text-[var(--muted)]">{t.scanQr}</span>
        </div>
      </div>

      <div className="mb-1 mt-6 flex flex-wrap border-b border-[var(--line)]">
        {(
          [
            ["donors", t.donors],
            ["expenses", t.expenses],
            ["timeline", t.timeline],
            ["gallery", t.gallery],
            ["activity", t.activity],
            ["members", t.members],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            type="button"
            className={`tab ${tab === key ? "active" : ""}`}
            onClick={() => setTab(key)}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="panel" style={{ borderTopLeftRadius: 0, borderTopRightRadius: 0, borderTop: 0 }}>
        {tab === "donors" && (
          <>
            <input
              className="input mb-3"
              placeholder={t.searchDonors}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            {filteredDonors.length ? (
              <div className="divide-y divide-[var(--line)]">
                {filteredDonors.map((c) => (
                  <div key={c.id} className="flex items-start justify-between gap-2 py-3">
                    <div>
                      <strong>{c.name}</strong>
                      <Badge mode={c.mode} />
                      <Badge
                        ok={c.status === "confirmed"}
                        label={
                          c.status === "awaiting_donor_confirm"
                            ? t.awaitingYes
                            : c.status === "confirmed"
                              ? "OK"
                              : c.status
                        }
                      />
                      <div className="text-[0.85rem] text-[var(--muted)]">
                        {c.village} · {c.phone} · {formatWhen(new Date(c.createdAt))}
                      </div>
                      <div className="mt-1.5 flex flex-wrap gap-1.5">
                        {c.status === "confirmed" && (
                          <button
                            type="button"
                            className="btn btn-ghost btn-sm"
                            onClick={() => thankYou(c)}
                          >
                            {t.thankYouWa}
                          </button>
                        )}
                        {c.status === "awaiting_donor_confirm" && (
                          <>
                            <button
                              type="button"
                              className="btn btn-primary btn-sm"
                              disabled={busy === c.id}
                              onClick={() => remind(c, "sms")}
                            >
                              {t.sendReminder}
                            </button>
                            <button
                              type="button"
                              className="btn btn-accent btn-sm"
                              disabled={busy === c.id}
                              onClick={() => remind(c, "whatsapp")}
                            >
                              {t.remindWhatsApp}
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                    <div
                      className="whitespace-nowrap font-bold"
                      style={{ color: c.status === "confirmed" ? "var(--ok)" : "var(--muted)" }}
                    >
                      {c.status === "confirmed" ? "+" : "~"}
                      {rupee(c.amount)}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="empty-box">
                <p>{search ? t.noMatch : t.noDonors}</p>
                {!search && (
                  <Link href={`/e/${event.slug}/contribute`} className="btn btn-accent btn-sm">
                    {t.firstContribute}
                  </Link>
                )}
              </div>
            )}
          </>
        )}

        {tab === "expenses" &&
          (event.expenses.length ? (
            <div className="divide-y divide-[var(--line)]">
              {event.expenses.map((x) => (
                <div key={x.id} className="py-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <strong>{x.item}</strong>
                      <Badge mode={x.mode} />
                      <Badge ok={x.approved} label={x.approved ? t.approved : t.pendingApprove} />
                      <div className="text-[0.85rem] text-[var(--muted)]">
                        {catLabel(x.category)} · {x.vendor}
                        {x.vendorUpi ? ` · ${x.vendorUpi}` : ""} ·{" "}
                        {formatWhen(new Date(x.createdAt))}
                        {x.gps ? ` · ${x.gps}` : ""}
                      </div>
                      {x.billNote && (
                        <div className="text-[0.85rem] text-[var(--muted)]">{x.billNote}</div>
                      )}
                      {x.billPhotoData && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={x.billPhotoData}
                          alt="Bill"
                          className="mt-2 max-h-28 rounded-lg border border-[var(--line)] object-contain"
                        />
                      )}
                      {x.flags?.length > 0 && (
                        <div className="mt-1 text-[0.8rem] text-[var(--danger)]">
                          {x.flags.map((f) => `${f.byName}: ${f.comment}`).join(" · ")}
                        </div>
                      )}
                    </div>
                    <div
                      className="whitespace-nowrap font-bold"
                      style={{ color: x.approved ? "var(--warn)" : "var(--muted)" }}
                    >
                      −{rupee(x.amount)}
                    </div>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {!x.approved && (
                      <button
                        type="button"
                        className="btn btn-primary btn-sm"
                        disabled={busy === x.id}
                        onClick={() => approveExpense(x.id)}
                      >
                        {t.coAdminApprove}
                      </button>
                    )}
                    <button
                      type="button"
                      className="btn btn-ghost btn-sm"
                      disabled={busy === x.id}
                      onClick={() => flagExpense(x.id)}
                    >
                      {t.flagDispute}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="empty-box">
              <p>{t.noExpenses}</p>
              <Link href={`/e/${event.slug}/expense`} className="btn btn-ghost btn-sm">
                {t.firstExpense}
              </Link>
            </div>
          ))}

        {tab === "timeline" &&
          (timeline.length ? (
            timeline.map((i, idx) => (
              <div
                key={idx}
                className="grid grid-cols-[88px_1fr] gap-2.5 border-b border-[var(--line)] py-2.5 text-[0.92rem] last:border-0"
              >
                <div className="text-[0.8rem] text-[var(--muted)]">{i.at.slice(0, 10)}</div>
                <div>
                  <span
                    className="font-bold"
                    style={{ color: i.kind === "in" ? "var(--ok)" : "var(--warn)" }}
                  >
                    {i.kind === "in" ? "+" : "−"}
                  </span>{" "}
                  {i.text}
                </div>
              </div>
            ))
          ) : (
            <p className="empty">{t.noTimeline}</p>
          ))}

        {tab === "gallery" && (
          <div>
            <div className="mb-3 flex flex-wrap items-end gap-2">
              <label className="block flex-1 min-w-[140px]">
                <span className="mb-1 block text-[0.8rem] font-semibold text-[var(--muted)]">
                  {t.caption}
                </span>
                <input
                  className="input"
                  value={caption}
                  onChange={(e) => setCaption(e.target.value)}
                />
              </label>
              <label className="btn btn-primary btn-sm cursor-pointer">
                {photoBusy ? t.saving : t.uploadPhoto}
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  disabled={photoBusy}
                  onChange={onPhotoFile}
                />
              </label>
            </div>
            {photos.length ? (
              <div className="gallery-grid">
                {photos.map((p) => (
                  <figure key={p.id} className="gallery-item">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={p.dataUrl} alt={p.caption || "photo"} />
                    {p.caption && <figcaption>{p.caption}</figcaption>}
                  </figure>
                ))}
              </div>
            ) : (
              <p className="empty">{t.noPhotos}</p>
            )}
          </div>
        )}

        {tab === "activity" &&
          (event.activityLogs.length ? (
            event.activityLogs.map((a) => (
              <div
                key={a.id}
                className="grid grid-cols-[88px_1fr] gap-2.5 border-b border-[var(--line)] py-2.5 text-[0.92rem] last:border-0"
              >
                <div className="text-[0.8rem] text-[var(--muted)]">
                  {a.createdAt.slice(0, 10)}
                </div>
                <div>
                  <strong>{a.action}</strong>
                  {a.detail ? ` — ${a.detail}` : ""}
                  {(a.actorName || a.actorPhone) && (
                    <div className="text-[0.8rem] text-[var(--muted)]">
                      {a.actorName || a.actorPhone}
                    </div>
                  )}
                </div>
              </div>
            ))
          ) : (
            <p className="empty">{t.noActivity}</p>
          ))}

        {tab === "members" && (
          <div>
            <ul className="mb-4 divide-y divide-[var(--line)]">
              {members.map((m) => (
                <li key={m.id} className="flex justify-between gap-2 py-2.5">
                  <div>
                    <strong>{m.name || m.phone}</strong>
                    <div className="text-[0.85rem] text-[var(--muted)]">{m.phone}</div>
                  </div>
                  <span className="text-[0.8rem] font-semibold text-[var(--brand)]">
                    {m.role === "admin"
                      ? t.roleAdmin
                      : m.role === "co_admin"
                        ? t.roleCoAdmin
                        : t.roleViewer}
                  </span>
                </li>
              ))}
            </ul>
            <form onSubmit={addMember} className="flex flex-col gap-2 border-t border-[var(--line)] pt-3">
              <strong className="text-[0.9rem]">{t.addMember}</strong>
              <input name="name" className="input" placeholder={t.memberName} />
              <input
                name="phone"
                required
                pattern="[0-9]{10}"
                className="input"
                placeholder={t.memberPhone}
              />
              <select name="role" className="input" defaultValue="viewer">
                <option value="viewer">{t.roleViewer}</option>
                <option value="co_admin">{t.roleCoAdmin}</option>
                <option value="admin">{t.roleAdmin}</option>
              </select>
              <button type="submit" className="btn btn-primary" disabled={busy === "member"}>
                {t.addMember}
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}

function Badge({
  mode,
  ok,
  label,
}: {
  mode?: string;
  ok?: boolean;
  label?: string;
}) {
  if (mode) {
    return (
      <span
        className="ml-1.5 inline-block rounded-[6px] border px-1.5 py-0.5 text-[0.7rem] font-semibold uppercase tracking-wide"
        style={{
          color: mode === "UPI" ? "var(--brand)" : "var(--warn)",
          borderColor: "var(--line)",
        }}
      >
        {mode}
      </span>
    );
  }
  return (
    <span
      className="ml-1.5 inline-block rounded-[6px] border px-1.5 py-0.5 text-[0.7rem] font-semibold uppercase tracking-wide"
      style={{
        color: ok ? "var(--ok)" : "var(--warn)",
        borderColor: "var(--line)",
      }}
    >
      {label || (ok ? "OK" : "Pending")}
    </span>
  );
}
