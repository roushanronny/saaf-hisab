import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

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

  const collected = event.contributions
    .filter((c) => c.status === "confirmed")
    .reduce((s, c) => s + c.amount, 0);
  const spent = event.expenses.reduce((s, x) => s + x.amount, 0);

  return NextResponse.json({
    ...event,
    collected,
    spent,
    balance: collected - spent,
  });
}
