import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyPaymentSignature } from "@/lib/razorpay";
import { confirmContributionPayment } from "@/lib/payments";
import { getAppConfig } from "@/lib/config";

export async function POST(req: Request) {
  const body = await req.json();
  const contributionId = String(body.contributionId || "");

  if (!contributionId) {
    return NextResponse.json({ error: "contributionId chahiye" }, { status: 400 });
  }

  const contribution = await prisma.contribution.findUnique({
    where: { id: contributionId },
    include: { paymentIntent: true, event: true },
  });

  if (!contribution) {
    return NextResponse.json({ error: "Contribution nahi mili" }, { status: 404 });
  }

  // Only real simulate intents — never trust client mode: "simulate"
  if (contribution.paymentIntent?.provider === "simulate") {
    const result = await confirmContributionPayment({
      contributionId,
      paymentId: `SIM${Date.now()}`,
    });
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }
    return NextResponse.json({
      contribution: result.contribution,
      sms: result.sms,
      smsSent: result.smsSent,
      smsProvider: result.smsProvider,
      mode: "simulate",
    });
  }

  const orderId = String(body.razorpay_order_id || "");
  const paymentId = String(body.razorpay_payment_id || "");
  const signature = String(body.razorpay_signature || "");

  if (!orderId || !paymentId || !signature) {
    return NextResponse.json({ error: "Razorpay payment fields missing" }, { status: 400 });
  }

  const cfg = getAppConfig();
  if (!cfg.razorpayEnabled) {
    return NextResponse.json({ error: "Razorpay enabled nahi" }, { status: 400 });
  }

  if (!verifyPaymentSignature({ orderId, paymentId, signature })) {
    return NextResponse.json({ error: "Invalid payment signature" }, { status: 400 });
  }

  if (
    contribution.paymentIntent?.razorpayOrderId &&
    contribution.paymentIntent.razorpayOrderId !== orderId
  ) {
    return NextResponse.json({ error: "Order mismatch" }, { status: 400 });
  }

  const result = await confirmContributionPayment({
    contributionId,
    paymentId,
    orderId,
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  return NextResponse.json({
    contribution: result.contribution,
    sms: result.sms,
    smsSent: result.smsSent,
    smsProvider: result.smsProvider,
    mode: "razorpay",
    already: result.already,
  });
}
