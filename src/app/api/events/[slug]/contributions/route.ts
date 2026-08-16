import { NextResponse } from "next/server";
import { getAppConfig } from "@/lib/config";
import { prisma } from "@/lib/prisma";
import { confirmToken, receiptNo } from "@/lib/format";
import { buildCashConfirmMessage, sendSms } from "@/lib/sms";
import { logActivity } from "@/lib/event-helpers";

type Ctx = { params: Promise<{ slug: string }> };

export async function POST(req: Request, ctx: Ctx) {
  const { slug } = await ctx.params;
  const body = await req.json();

  const event = await prisma.event.findUnique({ where: { slug } });
  if (!event) {
    return NextResponse.json({ error: "Event nahi mila" }, { status: 404 });
  }

  const phone = String(body.phone || "").trim();
  const name = String(body.name || "").trim();
  const village = String(body.village || "").trim();
  const father = String(body.father || "").trim();
  const amount = Number(body.amount);
  const otpSessionId = String(body.otpSessionId || "");
  const mode = body.mode === "Cash" ? "Cash" : null;

  if (mode !== "Cash") {
    return NextResponse.json(
      { error: "UPI ke liye /payments/create use karo" },
      { status: 400 }
    );
  }

  if (!name || !village || !father || !/^\d{10}$/.test(phone) || !(amount > 0)) {
    return NextResponse.json({ error: "Saari fields sahi bharo" }, { status: 400 });
  }

  const otp = await prisma.otpSession.findUnique({ where: { id: otpSessionId } });
  if (!otp || otp.phone !== phone || !otp.verified || otp.expiresAt < new Date()) {
    return NextResponse.json({ error: "Pehle phone OTP verify karo" }, { status: 403 });
  }

  const cfg = getAppConfig();
  const rNo = receiptNo();
  const token = confirmToken();
  const confirmExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
  const yesUrl = `${cfg.appUrl}/confirm/${token}?a=yes`;
  const noUrl = `${cfg.appUrl}/confirm/${token}?a=no`;

  const confirmSms = buildCashConfirmMessage({
    name,
    amount,
    eventName: event.name,
    yesUrl,
    noUrl,
  });
  const smsResult = await sendSms(phone, confirmSms);

  const contribution = await prisma.contribution.create({
    data: {
      eventId: event.id,
      name,
      phone,
      village,
      father,
      amount,
      mode: "Cash",
      receiptNo: rNo,
      status: "awaiting_donor_confirm",
      confirmToken: token,
      confirmExpiresAt,
      receiptSmsPreview: smsResult.preview,
      receiptSmsSent: smsResult.ok,
    },
  });

  await logActivity({
    eventId: event.id,
    action: "cash_pending",
    detail: `${name} · ₹${amount}`,
    actorPhone: phone,
    actorName: name,
  });

  return NextResponse.json(
    {
      contribution,
      sms: smsResult.preview,
      smsSent: smsResult.ok,
      smsProvider: smsResult.provider,
      confirmUrlYes: yesUrl,
      confirmUrlNo: noUrl,
      message:
        "Donor ko YES/NO SMS gaya. Confirm hone ke baad hi list mein confirmed dikhega + receipt.",
    },
    { status: 201 }
  );
}
