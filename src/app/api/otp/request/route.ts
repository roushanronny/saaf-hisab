import { NextResponse } from "next/server";
import { getAppConfig } from "@/lib/config";
import { prisma } from "@/lib/prisma";
import { buildOtpMessage, sendSms } from "@/lib/sms";

function randomOtp() {
  return String(Math.floor(1000 + Math.random() * 9000));
}

export async function POST(req: Request) {
  const body = await req.json();
  const phone = String(body.phone || "").trim();
  const purpose = String(body.purpose || "contribute");

  if (!/^\d{10}$/.test(phone)) {
    return NextResponse.json({ error: "Valid 10-digit phone chahiye" }, { status: 400 });
  }

  const cfg = getAppConfig();
  const code = cfg.smsLive ? randomOtp() : cfg.demoOtp;
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

  const session = await prisma.otpSession.create({
    data: { phone, code, purpose, expiresAt },
  });

  const sms = await sendSms(phone, buildOtpMessage(code));

  if (cfg.smsLive && !sms.ok) {
    return NextResponse.json(
      {
        error: sms.error || "SMS bhej nahi paya",
        otpSessionId: session.id,
        smsLive: true,
        smsProvider: sms.provider,
      },
      { status: 502 }
    );
  }

  return NextResponse.json({
    otpSessionId: session.id,
    smsLive: cfg.smsLive,
    smsProvider: sms.provider,
    smsOk: sms.ok,
    demoHint: cfg.smsLive
      ? "OTP aapke phone pe bhej diya gaya hai"
      : `SMS keys nahi — demo OTP: ${code}`,
    expiresAt,
  });
}
