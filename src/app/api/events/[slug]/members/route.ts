import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { logActivity, type MemberRole } from "@/lib/event-helpers";

type Ctx = { params: Promise<{ slug: string }> };

export async function GET(_req: Request, ctx: Ctx) {
  const { slug } = await ctx.params;
  const event = await prisma.event.findUnique({ where: { slug } });
  if (!event) return NextResponse.json({ error: "Event nahi mila" }, { status: 404 });

  const members = await prisma.eventMember.findMany({
    where: { eventId: event.id },
    orderBy: { createdAt: "asc" },
  });
  return NextResponse.json(members);
}

export async function POST(req: Request, ctx: Ctx) {
  const { slug } = await ctx.params;
  const body = await req.json();
  const event = await prisma.event.findUnique({ where: { slug } });
  if (!event) return NextResponse.json({ error: "Event nahi mila" }, { status: 404 });

  const phone = String(body.phone || "").trim();
  const name = String(body.name || "").trim() || null;
  const role = String(body.role || "viewer") as MemberRole;
  const actorPhone = String(body.actorPhone || "").trim();

  if (!/^\d{10}$/.test(phone)) {
    return NextResponse.json({ error: "10-digit phone" }, { status: 400 });
  }
  if (!["admin", "co_admin", "viewer"].includes(role)) {
    return NextResponse.json({ error: "Invalid role" }, { status: 400 });
  }
  if (actorPhone !== event.adminPhone) {
    return NextResponse.json({ error: "Sirf admin member add kar sakta hai" }, { status: 403 });
  }

  const member = await prisma.eventMember.upsert({
    where: { eventId_phone: { eventId: event.id, phone } },
    create: { eventId: event.id, phone, name, role },
    update: { name, role },
  });

  if (role === "co_admin" && !event.coAdminPhone) {
    await prisma.event.update({
      where: { id: event.id },
      data: { coAdminPhone: phone },
    });
  }

  await logActivity({
    eventId: event.id,
    action: "member_added",
    detail: `${phone} · ${role}`,
    actorPhone,
  });

  return NextResponse.json(member, { status: 201 });
}
