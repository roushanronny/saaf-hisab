import { NextResponse } from "next/server";
import { getAppConfig } from "@/lib/config";
import { prisma } from "@/lib/prisma";
import { buildReceiptMessage, sendSms } from "@/lib/sms";
import { logActivity } from "@/lib/event-helpers";

type Ctx = { params: Promise<{ token: string }> };

export async function GET(req: Request, ctx: Ctx) {
  const { token } = await ctx.params;
  const { searchParams } = new URL(req.url);
  const answer = (searchParams.get("a") || "").toLowerCase();

  const contribution = await prisma.contribution.findUnique({
    where: { confirmToken: token },
    include: { event: true },
  });

  if (!contribution) {
    return NextResponse.json({ error: "Invalid link" }, { status: 404 });
  }

  if (contribution.status === "confirmed") {
    return NextResponse.json({
      ok: true,
      already: true,
      status: "confirmed",
      contribution,
    });
  }

  if (contribution.status === "rejected") {
    return NextResponse.json({
      ok: true,
      already: true,
      status: "rejected",
      contribution,
    });
  }

  if (contribution.confirmExpiresAt && contribution.confirmExpiresAt < new Date()) {
    await prisma.contribution.update({
      where: { id: contribution.id },
      data: { status: "expired" },
    });
    return NextResponse.json({ error: "Confirm link expire ho gaya" }, { status: 400 });
  }

  if (answer !== "yes" && answer !== "no") {
    return NextResponse.json({
      ok: true,
      pending: true,
      contribution: {
        name: contribution.name,
        amount: contribution.amount,
        eventName: contribution.event.name,
        status: contribution.status,
      },
    });
  }

  if (answer === "no") {
    const updated = await prisma.contribution.update({
      where: { id: contribution.id },
      data: { status: "rejected" },
      include: { event: true },
    });
    await logActivity({
      eventId: contribution.eventId,
      action: "cash_rejected",
      detail: `${contribution.name} · ₹${contribution.amount}`,
      actorPhone: contribution.phone,
      actorName: contribution.name,
    });
    return NextResponse.json({
      ok: true,
      status: "rejected",
      contribution: updated,
      message: "Cash entry reject — public list mein nahi jayegi.",
    });
  }

  const cfg = getAppConfig();
  const eventUrl = `${cfg.appUrl}/e/${contribution.event.slug}`;
  const smsText = buildReceiptMessage({
    name: contribution.name,
    amount: contribution.amount,
    eventName: contribution.event.name,
    receiptNo: contribution.receiptNo,
    eventUrl,
  });
  const smsResult = await sendSms(contribution.phone, smsText);

  const updated = await prisma.contribution.update({
    where: { id: contribution.id },
    data: {
      status: "confirmed",
      receiptSmsPreview: smsResult.preview,
      receiptSmsSent: smsResult.ok,
    },
    include: { event: true },
  });

  await logActivity({
    eventId: contribution.eventId,
    action: "cash_confirmed",
    detail: `${contribution.name} · ₹${contribution.amount}`,
    actorPhone: contribution.phone,
    actorName: contribution.name,
  });

  return NextResponse.json({
    ok: true,
    status: "confirmed",
    contribution: updated,
    sms: smsResult.preview,
    smsSent: smsResult.ok,
    message: "Dhanyawad — cash confirm. Receipt bhej diya.",
  });
}
