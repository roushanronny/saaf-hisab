import { NextResponse } from "next/server";
import { getAppConfig } from "@/lib/config";
import { prisma } from "@/lib/prisma";
import { receiptNo } from "@/lib/format";
import { createRazorpayOrder } from "@/lib/razorpay";
import { consumeOtpSession } from "@/lib/access";

type Ctx = { params: Promise<{ slug: string }> };

export async function POST(req: Request, ctx: Ctx) {
  const { slug } = await ctx.params;
  const body = await req.json();
  const cfg = getAppConfig();

  const event = await prisma.event.findUnique({ where: { slug } });
  if (!event) {
    return NextResponse.json({ error: "Event nahi mila" }, { status: 404 });
  }

  const phone = String(body.phone || "").trim();
  const name = String(body.name || "").trim();
  const village = String(body.village || "").trim();
  const father = String(body.father || "").trim();
  const amount = Number(body.amount);
  const otpSessionId = String(body.otpSessionId || "");

  if (!name || !village || !father || !/^\d{10}$/.test(phone) || !(amount > 0)) {
    return NextResponse.json({ error: "Saari fields sahi bharo" }, { status: 400 });
  }

  const otp = await consumeOtpSession(otpSessionId, phone);
  if (!otp) {
    return NextResponse.json(
      { error: "Pehle phone OTP verify karo (ya naya OTP lo)" },
      { status: 403 }
    );
  }

  const rNo = receiptNo();

  if (!cfg.razorpayEnabled) {
    // Dev / no keys: pending contribution + simulate intent
    const contribution = await prisma.contribution.create({
      data: {
        eventId: event.id,
        name,
        phone,
        village,
        father,
        amount,
        mode: "UPI",
        receiptNo: rNo,
        status: "pending",
        paymentIntent: {
          create: {
            provider: "simulate",
            amount,
            status: "created",
          },
        },
      },
      include: { paymentIntent: true },
    });

    return NextResponse.json({
      mode: "simulate",
      contributionId: contribution.id,
      receiptNo: contribution.receiptNo,
      amount,
      message: "Razorpay keys nahi — simulate mode. .env mein keys add karo for live UPI.",
    });
  }

  try {
    const contribution = await prisma.contribution.create({
      data: {
        eventId: event.id,
        name,
        phone,
        village,
        father,
        amount,
        mode: "UPI",
        receiptNo: rNo,
        status: "pending",
      },
    });

    const order = await createRazorpayOrder({
      amountInr: amount,
      receipt: contribution.id,
      notes: {
        eventSlug: event.slug,
        contributionId: contribution.id,
        donorPhone: phone,
      },
    });

    await prisma.paymentIntent.create({
      data: {
        contributionId: contribution.id,
        provider: "razorpay",
        amount,
        status: "created",
        razorpayOrderId: order.id,
        rawPayload: JSON.stringify(order),
      },
    });

    return NextResponse.json({
      mode: "razorpay",
      contributionId: contribution.id,
      receiptNo: contribution.receiptNo,
      amount,
      orderId: order.id,
      keyId: cfg.razorpayKeyId,
      currency: "INR",
      name: "SAAF Hisāb",
      description: event.name,
      prefill: {
        name,
        contact: phone,
      },
      notes: {
        eventSlug: event.slug,
        contributionId: contribution.id,
      },
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Order create fail";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
