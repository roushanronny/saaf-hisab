import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type Ctx = { params: Promise<{ slug: string; expenseId: string }> };

export async function POST(req: Request, ctx: Ctx) {
  const { slug, expenseId } = await ctx.params;
  const body = await req.json();

  const byName = String(body.byName || "").trim();
  const byPhone = String(body.byPhone || "").trim();
  const comment = String(body.comment || "").trim();

  if (!byName || !comment || !/^\d{10}$/.test(byPhone)) {
    return NextResponse.json(
      { error: "Naam, 10-digit phone, comment zaroori" },
      { status: 400 }
    );
  }

  const event = await prisma.event.findUnique({ where: { slug } });
  if (!event) {
    return NextResponse.json({ error: "Event nahi mila" }, { status: 404 });
  }

  const expense = await prisma.expense.findFirst({
    where: { id: expenseId, eventId: event.id },
  });
  if (!expense) {
    return NextResponse.json({ error: "Expense nahi mili" }, { status: 404 });
  }

  const flag = await prisma.disputeFlag.create({
    data: {
      expenseId: expense.id,
      byName,
      byPhone,
      comment,
      status: "open",
    },
  });

  return NextResponse.json({ flag }, { status: 201 });
}
