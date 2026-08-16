import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hasViewAccess } from "@/lib/access";

type Ctx = { params: Promise<{ slug: string }> };

export async function GET(_req: Request, ctx: Ctx) {
  const { slug } = await ctx.params;
  const event = await prisma.event.findUnique({
    where: { slug },
    include: {
      contributions: { orderBy: { createdAt: "desc" } },
      expenses: { orderBy: { createdAt: "desc" } },
    },
  });

  if (!event) {
    return NextResponse.json({ error: "Event nahi mila" }, { status: 404 });
  }

  const unlocked = await hasViewAccess(slug, event.viewPasswordHash);
  if (!unlocked) {
    return NextResponse.json(
      {
        slug: event.slug,
        name: event.name,
        purpose: event.purpose,
        visibility: event.visibility,
        hasViewPassword: true,
        locked: true,
      },
      { status: 401 }
    );
  }

  const collected = event.contributions
    .filter((c) => c.status === "confirmed")
    .reduce((s, c) => s + c.amount, 0);
  const spent = event.expenses
    .filter((x) => x.approved)
    .reduce((s, x) => s + x.amount, 0);

  return NextResponse.json({
    ...event,
    adminPinHash: undefined,
    viewPasswordHash: undefined,
    hasViewPassword: Boolean(event.viewPasswordHash),
    collected,
    spent,
    balance: collected - spent,
  });
}
