import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyWebhookSignature } from "@/lib/razorpay";
import { confirmContributionPayment } from "@/lib/payments";

export async function POST(req: Request) {
  const rawBody = await req.text();
  const signature = req.headers.get("x-razorpay-signature") || "";

  if (!verifyWebhookSignature(rawBody, signature)) {
    return NextResponse.json({ error: "Invalid webhook signature" }, { status: 400 });
  }

  let payload: {
    event?: string;
    payload?: {
      payment?: {
        entity?: {
          id?: string;
          order_id?: string;
          notes?: { contributionId?: string };
        };
      };
    };
  };

  try {
    payload = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const eventName = payload.event || "";
  if (eventName !== "payment.captured" && eventName !== "order.paid") {
    return NextResponse.json({ ok: true, ignored: eventName });
  }

  const payment = payload.payload?.payment?.entity;
  const paymentId = payment?.id;
  const orderId = payment?.order_id;
  let contributionId = payment?.notes?.contributionId;

  if (!contributionId && orderId) {
    const intent = await prisma.paymentIntent.findUnique({
      where: { razorpayOrderId: orderId },
    });
    contributionId = intent?.contributionId;
  }

  if (!contributionId || !paymentId) {
    return NextResponse.json({ ok: true, skipped: true });
  }

  const result = await confirmContributionPayment({
    contributionId,
    paymentId,
    orderId,
  });

  return NextResponse.json({
    ok: result.ok,
    already: result.ok ? result.already : false,
  });
}
