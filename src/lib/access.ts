import { cookies } from "next/headers";
import type { Event } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { hashPin, verifyPin } from "@/lib/pin";

export function viewCookieName(slug: string) {
  return `saaf_view_${slug}`;
}

export function viewCookieValue(slug: string, passwordHash: string) {
  return hashPin(`${slug}:${passwordHash}`);
}

export function pinCookieName(slug: string) {
  return `saaf_pin_${slug}`;
}

export function pinCookieValue(slug: string, pinHash: string) {
  return hashPin(`${slug}:pin:${pinHash}`);
}

export async function hasViewAccess(slug: string, viewPasswordHash: string | null | undefined) {
  if (!viewPasswordHash) return true;
  const jar = await cookies();
  const raw = jar.get(viewCookieName(slug))?.value;
  if (!raw) return false;
  return raw === viewCookieValue(slug, viewPasswordHash);
}

export async function hasAdminPinAccess(slug: string, adminPinHash: string | null | undefined) {
  if (!adminPinHash) return true;
  const jar = await cookies();
  const raw = jar.get(pinCookieName(slug))?.value;
  if (!raw) return false;
  return raw === pinCookieValue(slug, adminPinHash);
}

export async function requireEventAdminPin(
  slug: string,
  pin?: string | null
): Promise<{ ok: true; event: Event } | { ok: false; status: number; error: string }> {
  const event = await prisma.event.findUnique({ where: { slug } });
  if (!event) return { ok: false, status: 404, error: "Event nahi mila" };
  if (!event.adminPinHash) return { ok: true, event };

  if (pin && verifyPin(String(pin), event.adminPinHash)) {
    return { ok: true, event };
  }

  if (await hasAdminPinAccess(slug, event.adminPinHash)) {
    return { ok: true, event };
  }

  return { ok: false, status: 403, error: "Admin PIN zaroori / galat" };
}

/** Mark OTP as single-use after first successful contribute/pay create */
export async function consumeOtpSession(otpSessionId: string, phone: string) {
  const otp = await prisma.otpSession.findUnique({ where: { id: otpSessionId } });
  if (!otp || otp.phone !== phone || !otp.verified || otp.consumed || otp.expiresAt < new Date()) {
    return null;
  }
  return prisma.otpSession.update({
    where: { id: otpSessionId },
    data: { consumed: true },
  });
}
