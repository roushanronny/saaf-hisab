import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { logActivity } from "@/lib/event-helpers";
import { requireEventAdminPin } from "@/lib/access";

type Ctx = { params: Promise<{ slug: string }> };

export async function GET(_req: Request, ctx: Ctx) {
  const { slug } = await ctx.params;
  const event = await prisma.event.findUnique({ where: { slug } });
  if (!event) return NextResponse.json({ error: "Event nahi mila" }, { status: 404 });

  const photos = await prisma.eventPhoto.findMany({
    where: { eventId: event.id },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(photos);
}

export async function POST(req: Request, ctx: Ctx) {
  const { slug } = await ctx.params;
  const body = await req.json();

  const gate = await requireEventAdminPin(slug, body.adminPin);
  if (!gate.ok) {
    return NextResponse.json({ error: gate.error }, { status: gate.status });
  }
  const event = gate.event;

  const dataUrl = String(body.dataUrl || "");
  const caption = String(body.caption || "").trim() || null;
  if (!dataUrl.startsWith("data:image/") || dataUrl.length > 900_000) {
    return NextResponse.json({ error: "Valid image (max ~600KB) chahiye" }, { status: 400 });
  }

  const photo = await prisma.eventPhoto.create({
    data: {
      eventId: event.id,
      dataUrl,
      caption,
      kind: "gallery",
    },
  });

  await logActivity({
    eventId: event.id,
    action: "photo_added",
    detail: caption || "gallery",
  });

  return NextResponse.json(photo, { status: 201 });
}
