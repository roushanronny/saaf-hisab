import { prisma } from "@/lib/prisma";

export type MemberRole = "admin" | "co_admin" | "viewer";

export const EXPENSE_CATEGORIES = [
  "tent",
  "prasad",
  "sound",
  "lighting",
  "decoration",
  "transport",
  "misc",
] as const;

export type ExpenseCategory = (typeof EXPENSE_CATEGORIES)[number];

export async function logActivity(opts: {
  eventId: string;
  action: string;
  detail?: string;
  actorPhone?: string | null;
  actorName?: string | null;
}) {
  try {
    await prisma.activityLog.create({
      data: {
        eventId: opts.eventId,
        action: opts.action,
        detail: opts.detail || null,
        actorPhone: opts.actorPhone || null,
        actorName: opts.actorName || null,
      },
    });
  } catch {
    // never block main flow
  }
}

export function roleCanApprove(role: MemberRole | string | null | undefined) {
  return role === "admin" || role === "co_admin";
}

export function roleCanManage(role: MemberRole | string | null | undefined) {
  return role === "admin";
}

export function roleCanExpense(role: MemberRole | string | null | undefined) {
  return role === "admin" || role === "co_admin";
}

export async function findMemberRole(eventId: string, phone: string) {
  const m = await prisma.eventMember.findUnique({
    where: { eventId_phone: { eventId, phone } },
  });
  return m?.role as MemberRole | undefined;
}

export function buildUpiPayUri(opts: {
  pa: string;
  pn: string;
  am?: number;
  tn?: string;
}) {
  const q = new URLSearchParams();
  q.set("pa", opts.pa.trim());
  q.set("pn", opts.pn.slice(0, 40));
  q.set("cu", "INR");
  if (opts.am && opts.am > 0) q.set("am", String(opts.am));
  if (opts.tn) q.set("tn", opts.tn.slice(0, 80));
  return `upi://pay?${q.toString()}`;
}

export function thankYouWhatsAppText(opts: {
  name: string;
  amount: number;
  eventName: string;
  receiptNo?: string;
  eventUrl?: string;
}) {
  const parts = [
    `🙏 धन्यवाद ${opts.name}!`,
    `आपने «${opts.eventName}» में ₹${opts.amount.toLocaleString("en-IN")} का योगदान दिया।`,
  ];
  if (opts.receiptNo) parts.push(`रसीद: ${opts.receiptNo}`);
  if (opts.eventUrl) parts.push(`हिसाब देखें: ${opts.eventUrl}`);
  parts.push(`— साफ़ हिसाब`);
  return parts.join("\n");
}

export function cashRemindWhatsAppText(opts: {
  name: string;
  amount: number;
  eventName: string;
  yesUrl: string;
  noUrl: string;
}) {
  return [
    `नमस्ते ${opts.name},`,
    `«${opts.eventName}» में ₹${opts.amount.toLocaleString("en-IN")} नकद की पुष्टि बाकी है।`,
    `हाँ: ${opts.yesUrl}`,
    `नहीं: ${opts.noUrl}`,
    `— साफ़ हिसाब`,
  ].join("\n");
}
