import { getAppConfig } from "@/lib/config";
import { prisma } from "@/lib/prisma";
import { buildReceiptMessage, sendSms } from "@/lib/sms";
import { logActivity } from "@/lib/event-helpers";

export async function confirmContributionPayment(opts: {
  contributionId: string;
  paymentId: string;
  orderId?: string;
}) {
  const contribution = await prisma.contribution.findUnique({
    where: { id: opts.contributionId },
    include: { event: true, paymentIntent: true },
  });

  if (!contribution) {
    return { ok: false as const, error: "Contribution nahi mili" };
  }

  if (contribution.status === "confirmed") {
    return {
      ok: true as const,
      contribution,
      sms: contribution.receiptSmsPreview || "",
      already: true,
    };
  }

  const cfg = getAppConfig();
  const eventUrl = `${cfg.appUrl}/e/${contribution.event.slug}`;
  const smsText = buildReceiptMessage({
    name: contribution.name,
    amount: contribution.amount,
    eventName: contribution.event.name,
    receiptNo: contribution.receiptNo,
    eventUrl,
  });

  const smsResult = await sendSms(contribution.phone, smsText);

  const updated = await prisma.$transaction(async (tx) => {
    const c = await tx.contribution.update({
      where: { id: contribution.id },
      data: {
        status: "confirmed",
        txnId: opts.paymentId,
        receiptSmsPreview: smsResult.preview,
        receiptSmsSent: smsResult.ok,
      },
      include: { event: true },
    });

    if (contribution.paymentIntent) {
      await tx.paymentIntent.update({
        where: { id: contribution.paymentIntent.id },
        data: {
          status: "paid",
          razorpayPaymentId: opts.paymentId,
          razorpayOrderId: opts.orderId || contribution.paymentIntent.razorpayOrderId,
        },
      });
    }

    return c;
  });

  await logActivity({
    eventId: contribution.eventId,
    action: "contribution_confirmed",
    detail: `${contribution.name} · ₹${contribution.amount} · UPI`,
    actorPhone: contribution.phone,
    actorName: contribution.name,
  });

  return {
    ok: true as const,
    contribution: updated,
    sms: smsResult.preview,
    smsSent: smsResult.ok,
    smsProvider: smsResult.provider,
    already: false,
  };
}
