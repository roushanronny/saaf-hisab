import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyPin } from "@/lib/pin";

type Ctx = { params: Promise<{ slug: string }> };

export async function POST(req: Request, ctx: Ctx) {
  const { slug } = await ctx.params;
  const body = await req.json();
  const pin = String(body.pin || "").trim();

  const event = await prisma.event.findUnique({ where: { slug } });
  if (!event) return NextResponse.json({ error: "Event nahi mila" }, { status: 404 });

  if (!event.adminPinHash) {
    return NextResponse.json({ ok: true, noPin: true });
  }

  if (!/^\d{4,6}$/.test(pin) || !verifyPin(pin, event.adminPinHash)) {
    return NextResponse.json({ ok: false, error: "Galat PIN" }, { status: 403 });
  }

  return NextResponse.json({ ok: true });
}
