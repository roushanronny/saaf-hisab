import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { APPROVAL_THRESHOLD, txnId } from "@/lib/format";
import { EXPENSE_CATEGORIES, logActivity } from "@/lib/event-helpers";

type Ctx = { params: Promise<{ slug: string }> };

export async function POST(req: Request, ctx: Ctx) {
  const { slug } = await ctx.params;
  const body = await req.json();

  const event = await prisma.event.findUnique({ where: { slug } });
  if (!event) {
    return NextResponse.json({ error: "Event nahi mila" }, { status: 404 });
  }

  const item = String(body.item || "").trim();
  const vendor = String(body.vendor || "").trim();
  const vendorUpi = String(body.vendorUpi || "").trim() || null;
  const amount = Number(body.amount);
  const mode = body.mode === "Cash" ? "Cash" : "UPI";
  const billNote = String(body.billNote || "").trim() || null;
  const billPhotoData = String(body.billPhotoData || "").trim() || null;
  const gps = String(body.gps || "").trim() || null;
  const categoryRaw = String(body.category || "misc").trim();
  const category = (EXPENSE_CATEGORIES as readonly string[]).includes(categoryRaw)
    ? categoryRaw
    : "misc";

  if (!item || !vendor || !(amount > 0)) {
    return NextResponse.json({ error: "Item, vendor, amount zaroori" }, { status: 400 });
  }

  if (mode === "UPI" && !vendorUpi) {
    return NextResponse.json(
      { error: "UPI kharcha pe vendor UPI ID zaroori (digital trail)" },
      { status: 400 }
    );
  }

  if (mode === "Cash" && !billPhotoData && !billNote) {
    return NextResponse.json(
      { error: "Cash kharcha pe bill photo ya note zaroori" },
      { status: 400 }
    );
  }

  const needsApproval = amount >= APPROVAL_THRESHOLD;

  const expense = await prisma.expense.create({
    data: {
      eventId: event.id,
      item,
      vendor,
      vendorUpi,
      amount,
      mode,
      category,
      txnId: mode === "UPI" ? txnId("PAYOUT") : null,
      billNote:
        mode === "Cash"
          ? billNote || "Bill attached"
          : `UPI payout → ${vendorUpi}`,
      billPhotoData: mode === "Cash" ? billPhotoData : null,
      gps: mode === "Cash" ? gps || "GPS unavailable" : null,
      needsApproval,
      approved: !needsApproval,
    },
  });

  await logActivity({
    eventId: event.id,
    action: needsApproval ? "expense_pending" : "expense_added",
    detail: `${item} · ${category} · ₹${amount}`,
  });

  if (mode === "Cash" && billPhotoData) {
    await prisma.eventPhoto.create({
      data: {
        eventId: event.id,
        dataUrl: billPhotoData,
        caption: `${item} — bill`,
        kind: "expense_proof",
      },
    });
  }

  return NextResponse.json(
    {
      expense,
      message: needsApproval
        ? `₹${APPROVAL_THRESHOLD}+ / rule: co-admin approve pending`
        : "Kharcha public list mein confirm",
    },
    { status: 201 }
  );
}
