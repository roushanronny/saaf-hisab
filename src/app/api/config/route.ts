import { NextResponse } from "next/server";
import { getAppConfig } from "@/lib/config";

export async function GET() {
  const cfg = getAppConfig();
  const keyId = process.env.RAZORPAY_KEY_ID || "";
  const keySecret = process.env.RAZORPAY_KEY_SECRET || "";
  const msg91 = process.env.MSG91_AUTH_KEY || "";

  return NextResponse.json({
    razorpayEnabled: cfg.razorpayEnabled,
    razorpayKeyId: cfg.razorpayEnabled ? cfg.razorpayKeyId.slice(0, 12) + "…" : null,
    smsLive: cfg.smsLive,
    smsProvider: cfg.smsProvider,
    appUrl: cfg.appUrl,
    hasDatabaseUrl: Boolean(process.env.DATABASE_URL),
    phase: 3,
    // safe diagnostics (no full secrets)
    debug: {
      razorpayKeyIdLen: keyId.length,
      razorpayKeyIdLooksValid: keyId.startsWith("rzp_"),
      razorpaySecretLen: keySecret.length,
      razorpaySecretLooksValid: keySecret.length >= 20,
      msg91Len: msg91.length,
      msg91LooksValid: msg91.length >= 16 && !msg91.includes(" "),
    },
  });
}
