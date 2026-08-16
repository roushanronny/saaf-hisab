import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  const body = await req.json();
  const otpSessionId = String(body.otpSessionId || "");
  const code = String(body.code || "").trim();

  const session = await prisma.otpSession.findUnique({ where: { id: otpSessionId } });
  if (!session) {
    return NextResponse.json({ error: "OTP session invalid" }, { status: 400 });
  }
  if (session.expiresAt < new Date()) {
    return NextResponse.json({ error: "OTP expire ho gaya" }, { status: 400 });
  }
  if (session.code !== code) {
    return NextResponse.json({ error: "Galat OTP" }, { status: 400 });
  }

  const updated = await prisma.otpSession.update({
    where: { id: otpSessionId },
    data: { verified: true },
  });

  return NextResponse.json({ ok: true, otpSessionId: updated.id, phone: updated.phone });
}
