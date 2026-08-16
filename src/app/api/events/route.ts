import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { slugify } from "@/lib/format";
import { hashPin } from "@/lib/pin";
import { logActivity } from "@/lib/event-helpers";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const events = await prisma.event.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        contributions: { where: { status: "confirmed" }, select: { amount: true } },
        expenses: { where: { approved: true }, select: { amount: true } },
      },
    });

    const data = events.map((e) => {
      const collected = e.contributions.reduce((s, c) => s + c.amount, 0);
      const spent = e.expenses.reduce((s, x) => s + x.amount, 0);
      return {
        id: e.id,
        slug: e.slug,
        name: e.name,
        purpose: e.purpose,
        visibility: e.visibility,
        target: e.target,
        collected,
        spent,
        balance: collected - spent,
        createdAt: e.createdAt,
      };
    });

    return NextResponse.json(data);
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return NextResponse.json(
      { error: "DB/query fail", detail: message, hasDb: Boolean(process.env.DATABASE_URL) },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  const body = await req.json();
  const name = String(body.name || "").trim();
  const adminPhone = String(body.adminPhone || "").trim();

  if (!name || !/^\d{10}$/.test(adminPhone)) {
    return NextResponse.json(
      { error: "Event naam aur 10-digit admin phone zaroori hai" },
      { status: 400 }
    );
  }

  const coAdminPhone = String(body.coAdminPhone || "").trim();
  if (coAdminPhone && !/^\d{10}$/.test(coAdminPhone)) {
    return NextResponse.json({ error: "Co-admin phone 10 digit hona chahiye" }, { status: 400 });
  }

  const adminPin = String(body.adminPin || "").trim();
  if (adminPin && !/^\d{4,6}$/.test(adminPin)) {
    return NextResponse.json({ error: "Admin PIN 4–6 digits" }, { status: 400 });
  }

  const viewPassword = String(body.viewPassword || "").trim();
  const visibility = body.visibility === "private" ? "private" : "public";
  if (visibility === "private" && viewPassword.length < 4) {
    return NextResponse.json(
      { error: "Private event ke liye view password (min 4) zaroori" },
      { status: 400 }
    );
  }

  const collectUpiId = String(body.collectUpiId || "").trim() || null;
  const viewerPhone = String(body.viewerPhone || "").trim();
  if (viewerPhone && !/^\d{10}$/.test(viewerPhone)) {
    return NextResponse.json({ error: "Viewer phone 10 digit" }, { status: 400 });
  }

  let slug = slugify(name);
  const exists = await prisma.event.findUnique({ where: { slug } });
  if (exists) slug = `${slug}-${Date.now().toString().slice(-4)}`;

  const members = [
    { phone: adminPhone, name: "Admin", role: "admin" },
    ...(coAdminPhone ? [{ phone: coAdminPhone, name: "Co-admin", role: "co_admin" }] : []),
    ...(viewerPhone ? [{ phone: viewerPhone, name: "Viewer", role: "viewer" }] : []),
  ];

  const event = await prisma.event.create({
    data: {
      slug,
      name,
      purpose: String(body.purpose || "").trim() || null,
      target: body.target ? Number(body.target) : null,
      visibility,
      adminPhone,
      coAdminPhone: coAdminPhone || null,
      adminPinHash: adminPin ? hashPin(adminPin) : null,
      viewPasswordHash: viewPassword ? hashPin(viewPassword) : null,
      collectUpiId,
      members: { create: members },
    },
    include: { members: true },
  });

  await logActivity({
    eventId: event.id,
    action: "event_created",
    detail: name,
    actorPhone: adminPhone,
    actorName: "Admin",
  });

  return NextResponse.json(event, { status: 201 });
}
