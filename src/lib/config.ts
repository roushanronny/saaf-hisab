export function getAppConfig() {
  const razorpayKeyId = process.env.RAZORPAY_KEY_ID || "";
  const razorpayKeySecret = process.env.RAZORPAY_KEY_SECRET || "";
  const razorpayWebhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET || "";
  const razorpayEnabled = Boolean(razorpayKeyId && razorpayKeySecret);

  const msg91AuthKey = process.env.MSG91_AUTH_KEY || "";
  const msg91SenderId = process.env.MSG91_SENDER_ID || "SAAFHB";
  const msg91TemplateId = process.env.MSG91_OTP_TEMPLATE_ID || "";
  const twilioSid = process.env.TWILIO_ACCOUNT_SID || "";
  const twilioToken = process.env.TWILIO_AUTH_TOKEN || "";
  const twilioFrom = process.env.TWILIO_FROM_NUMBER || "";

  const smsProvider = msg91AuthKey
    ? ("msg91" as const)
    : twilioSid && twilioToken && twilioFrom
      ? ("twilio" as const)
      : ("console" as const);

  const smsLive = smsProvider !== "console";
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const demoOtp = process.env.DEMO_OTP || "1234";

  return {
    razorpayKeyId,
    razorpayKeySecret,
    razorpayWebhookSecret,
    razorpayEnabled,
    msg91AuthKey,
    msg91SenderId,
    msg91TemplateId,
    twilioSid,
    twilioToken,
    twilioFrom,
    smsProvider,
    smsLive,
    appUrl,
    demoOtp,
  };
}

export type AppConfig = ReturnType<typeof getAppConfig>;
