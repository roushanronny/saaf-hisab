import { NextResponse } from "next/server";
import { getAppConfig } from "@/lib/config";
import fs from "fs";
import path from "path";

export const dynamic = "force-dynamic";

export async function GET() {
  const cfg = getAppConfig();
  const publicApp = Boolean(cfg.appUrl && !cfg.appUrl.includes("localhost"));

  return NextResponse.json({
    items: {
      razorpayUpi: {
        done: cfg.razorpayEnabled,
        detail: cfg.razorpayEnabled
          ? `Key ID: ${cfg.razorpayKeyId.slice(0, 12)}…`
          : "Vercel pe RAZORPAY_KEY_ID + RAZORPAY_KEY_SECRET daalo (Test keys pehle)",
      },
      otpSms: {
        done: cfg.smsLive,
        detail: cfg.smsLive
          ? `Provider: ${cfg.smsProvider}`
          : "Vercel pe MSG91_AUTH_KEY daalo (ya Twilio 3 keys)",
      },
      receiptSms: {
        done: cfg.smsLive,
        detail: cfg.smsLive
          ? `Same as OTP (${cfg.smsProvider})`
          : "SMS key ke baad receipt bhi real ho jayega",
      },
      webhook: {
        done: Boolean(cfg.razorpayWebhookSecret && publicApp),
        detail: !publicApp
          ? "NEXT_PUBLIC_APP_URL public hona chahiye"
          : cfg.razorpayWebhookSecret
            ? `OK — ${cfg.appUrl}/api/webhooks/razorpay`
            : `APP_URL OK. Ab Razorpay webhook + RAZORPAY_WEBHOOK_SECRET chahiye`,
      },
    },
    appUrl: cfg.appUrl,
    webhookUrl: `${cfg.appUrl}/api/webhooks/razorpay`,
    canWriteEnv: process.env.NODE_ENV !== "production",
    isVercel: Boolean(process.env.VERCEL),
    vercelEnvUrl:
      "https://vercel.com/roushan-kumars-projects-97d60324/saaf-hisab/settings/environment-variables",
  });
}

/** Dev-only: write keys into .env */
export async function POST(req: Request) {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json(
      {
        error:
          "Live site pe yahan save nahi hota. Keys Vercel → Environment Variables mein daalo, phir Redeploy.",
      },
      { status: 403 }
    );
  }

  const body = await req.json();
  const envPath = path.join(process.cwd(), ".env");
  let current = fs.existsSync(envPath) ? fs.readFileSync(envPath, "utf8") : "";

  const updates: Record<string, string> = {};
  const keys = [
    "RAZORPAY_KEY_ID",
    "RAZORPAY_KEY_SECRET",
    "RAZORPAY_WEBHOOK_SECRET",
    "MSG91_AUTH_KEY",
    "MSG91_SENDER_ID",
    "TWILIO_ACCOUNT_SID",
    "TWILIO_AUTH_TOKEN",
    "TWILIO_FROM_NUMBER",
    "NEXT_PUBLIC_APP_URL",
    "DEMO_OTP",
  ] as const;

  for (const k of keys) {
    if (body[k] !== undefined && body[k] !== null && String(body[k]).trim() !== "") {
      updates[k] = String(body[k]).trim();
    }
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "Koi value nahi bheji" }, { status: 400 });
  }

  for (const [k, v] of Object.entries(updates)) {
    const line = `${k}="${v.replace(/"/g, '\\"')}"`;
    const re = new RegExp(`^${k}=.*$`, "m");
    if (re.test(current)) current = current.replace(re, line);
    else current = current.trimEnd() + `\n${line}\n`;
  }

  fs.writeFileSync(envPath, current, "utf8");

  return NextResponse.json({
    ok: true,
    updated: Object.keys(updates),
    note: "Keys save. `npm run dev` restart karo.",
  });
}
