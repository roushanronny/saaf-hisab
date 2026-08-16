import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { findMemberRole, logActivity, roleCanApprove } from "@/lib/event-helpers";

type Ctx = { params: Promise<{ slug: string; expenseId: string }> };

export async function POST(req: Request, ctx: Ctx) {
  const { slug, expenseId } = await ctx.params;
  const body = await req.json();
  const coAdminPhone = String(body.coAdminPhone || "").trim();

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

  if (expense.approved) {
    return NextResponse.json({ expense, already: true });
  }

  if (!/^\d{10}$/.test(coAdminPhone)) {
    return NextResponse.json({ error: "Verifier phone (10 digit) chahiye" }, { status: 400 });
  }

  const memberRole = await findMemberRole(event.id, coAdminPhone);
  const legacyOk =
    coAdminPhone === event.adminPhone ||
    (event.coAdminPhone ? coAdminPhone === event.coAdminPhone : false);

  if (!legacyOk && !roleCanApprove(memberRole)) {
    return NextResponse.json(
      { error: "Sirf admin / co-admin approve kar sakte hain" },
      { status: 403 }
    );
  }

  const updated = await prisma.expense.update({
    where: { id: expense.id },
    data: {
      approved: true,
      approvedByPhone: coAdminPhone,
      needsApproval: false,
    },
  });

  await logActivity({
    eventId: event.id,
    action: "expense_approved",
    detail: `${expense.item} · ₹${expense.amount}`,
    actorPhone: coAdminPhone,
  });

  return NextResponse.json({ expense: updated, message: "Expense approved" });
}
