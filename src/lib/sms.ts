import { getAppConfig } from "@/lib/config";

export type SendSmsResult = {
  ok: boolean;
  provider: "msg91" | "twilio" | "console";
  preview: string;
  providerId?: string;
  error?: string;
};

function toE164India(phone: string) {
  const p = phone.replace(/\D/g, "");
  if (p.length === 10) return `91${p}`;
  if (p.startsWith("91") && p.length === 12) return p;
  return p;
}

export async function sendSms(phone: string, message: string): Promise<SendSmsResult> {
  const cfg = getAppConfig();
  const preview = message;

  if (cfg.smsProvider === "msg91") {
    try {
      const mobiles = toE164India(phone);
      const res = await fetch(
        `https://control.msg91.com/api/sendhttp.php?authkey=${encodeURIComponent(
          cfg.msg91AuthKey
        )}&mobiles=${encodeURIComponent(mobiles)}&message=${encodeURIComponent(
          message
        )}&sender=${encodeURIComponent(cfg.msg91SenderId)}&route=4&country=91`,
        { method: "GET" }
      );
      const text = await res.text();
      if (!res.ok) {
        return { ok: false, provider: "msg91", preview, error: text || "MSG91 failed" };
      }
      return { ok: true, provider: "msg91", preview, providerId: text };
    } catch (e) {
      return {
        ok: false,
        provider: "msg91",
        preview,
        error: e instanceof Error ? e.message : "MSG91 error",
      };
    }
  }

  if (cfg.smsProvider === "twilio") {
    try {
      const to = `+${toE164India(phone)}`;
      const auth = Buffer.from(`${cfg.twilioSid}:${cfg.twilioToken}`).toString("base64");
      const body = new URLSearchParams({
        To: to,
        From: cfg.twilioFrom,
        Body: message,
      });
      const res = await fetch(
        `https://api.twilio.com/2010-04-01/Accounts/${cfg.twilioSid}/Messages.json`,
        {
          method: "POST",
          headers: {
            Authorization: `Basic ${auth}`,
            "Content-Type": "application/x-www-form-urlencoded",
          },
          body,
        }
      );
      const data = await res.json();
      if (!res.ok) {
        return {
          ok: false,
          provider: "twilio",
          preview,
          error: data.message || "Twilio failed",
        };
      }
      return { ok: true, provider: "twilio", preview, providerId: data.sid };
    } catch (e) {
      return {
        ok: false,
        provider: "twilio",
        preview,
        error: e instanceof Error ? e.message : "Twilio error",
      };
    }
  }

  // Dev fallback — log only
  console.log(`[SMS:console] → ${phone}\n${message}`);
  return { ok: true, provider: "console", preview };
}

export function buildOtpMessage(code: string) {
  return `SAAF Hisab OTP: ${code}. Yeh code 10 minute tak valid hai. Share mat karo.`;
}

export function buildReceiptMessage(opts: {
  name: string;
  amount: number;
  eventName: string;
  receiptNo: string;
  eventUrl: string;
}) {
  return `Dhanyawad ${opts.name}! Aapne ₹${opts.amount} diya "${opts.eventName}" mein. Receipt No: ${opts.receiptNo}. Dekho: ${opts.eventUrl}`;
}

export function buildCashConfirmMessage(opts: {
  name: string;
  amount: number;
  eventName: string;
  yesUrl: string;
  noUrl: string;
}) {
  return `SAAF Hisab: Kya aapne "${opts.eventName}" mein ₹${opts.amount} cash diya (${opts.name})? YES: ${opts.yesUrl} NO: ${opts.noUrl}`;
}
