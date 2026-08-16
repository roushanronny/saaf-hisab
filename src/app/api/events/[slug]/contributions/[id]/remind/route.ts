import { NextResponse } from "next/server";
import { getAppConfig } from "@/lib/config";
import { prisma } from "@/lib/prisma";
import { buildCashConfirmMessage, sendSms } from "@/lib/sms";
import { cashRemindWhatsAppText, logActivity } from "@/lib/event-helpers";
import { requireEventAdminPin } from "@/lib/access";

type Ctx = { params: Promise<{ slug: string; id: string }> };

export async function POST(req: Request, ctx: Ctx) {
  const { slug, id } = await ctx.params;
  const body = await req.json().catch(() => ({}));
  const via = String(body.via || "sms");

  const gate = await requireEventAdminPin(slug, body.adminPin);
  if (!gate.ok) {
    return NextResponse.json({ error: gate.error }, { status: gate.status });
  }
  const event = gate.event;

  const contribution = await prisma.contribution.findFirst({
    where: { id, eventId: event.id },
  });
  if (!contribution) {
    return NextResponse.json({ error: "Contribution nahi mili" }, { status: 404 });
  }
  if (contribution.status !== "awaiting_donor_confirm" || !contribution.confirmToken) {
    return NextResponse.json({ error: "Sirf pending cash pe reminder" }, { status: 400 });
  }

  const cfg = getAppConfig();
  const yesUrl = `${cfg.appUrl}/confirm/${contribution.confirmToken}?a=yes`;
  const noUrl = `${cfg.appUrl}/confirm/${contribution.confirmToken}?a=no`;

  const sms = buildCashConfirmMessage({
    name: contribution.name,
    amount: contribution.amount,
    eventName: event.name,
    yesUrl,
    noUrl,
  });

  let smsSent = false;
  let smsProvider = "skip";
  if (via === "sms" || via === "both") {
    const result = await sendSms(contribution.phone, sms);
    smsSent = result.ok;
    smsProvider = result.provider;
  }

  const waText = cashRemindWhatsAppText({
    name: contribution.name,
    amount: contribution.amount,
    eventName: event.name,
    yesUrl,
    noUrl,
  });
  const waUrl = `https://wa.me/91${contribution.phone}?text=${encodeURIComponent(waText)}`;

  await prisma.contribution.update({
    where: { id: contribution.id },
    data: { lastRemindedAt: new Date() },
  });

  await logActivity({
    eventId: event.id,
    action: "cash_reminded",
    detail: `${contribution.name} · ₹${contribution.amount} · ${via}`,
  });

  return NextResponse.json({
    ok: true,
    smsSent,
    smsProvider,
    sms,
    waUrl,
    yesUrl,
    noUrl,
  });
}
