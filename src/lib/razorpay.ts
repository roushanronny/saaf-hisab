import crypto from "crypto";
import Razorpay from "razorpay";
import { getAppConfig } from "@/lib/config";

export function getRazorpay() {
  const cfg = getAppConfig();
  if (!cfg.razorpayEnabled) return null;
  return new Razorpay({
    key_id: cfg.razorpayKeyId,
    key_secret: cfg.razorpayKeySecret,
  });
}

export async function createRazorpayOrder(opts: {
  amountInr: number;
  receipt: string;
  notes?: Record<string, string>;
}): Promise<{ id: string; amount: number; currency: string }> {
  const rzp = getRazorpay();
  if (!rzp) {
    throw new Error("Razorpay keys set nahi hain (.env mein RAZORPAY_KEY_ID/SECRET)");
  }

  const order = (await rzp.orders.create({
    amount: Math.round(opts.amountInr * 100),
    currency: "INR",
    receipt: opts.receipt.slice(0, 40),
    notes: opts.notes,
    payment_capture: true,
  })) as unknown as { id: string; amount: number; currency: string };

  return order;
}

export function verifyPaymentSignature(opts: {
  orderId: string;
  paymentId: string;
  signature: string;
}) {
  const cfg = getAppConfig();
  const payload = `${opts.orderId}|${opts.paymentId}`;
  const expected = crypto
    .createHmac("sha256", cfg.razorpayKeySecret)
    .update(payload)
    .digest("hex");
  return expected === opts.signature;
}

export function verifyWebhookSignature(rawBody: string, signature: string) {
  const cfg = getAppConfig();
  if (!cfg.razorpayWebhookSecret) return false;
  const expected = crypto
    .createHmac("sha256", cfg.razorpayWebhookSecret)
    .update(rawBody)
    .digest("hex");
  return expected === signature;
}
