import { NextResponse } from "next/server";

export function jsonError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

export async function requireVerifiedOtp(otpSessionId: string, phone: string) {
  const { prisma } = await import("@/lib/prisma");
  const otp = await prisma.otpSession.findUnique({ where: { id: otpSessionId } });
  if (!otp || otp.phone !== phone || !otp.verified || otp.expiresAt < new Date()) {
    return null;
  }
  return otp;
}
