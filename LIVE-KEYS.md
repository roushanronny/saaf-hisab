# Live keys — tum paste karo, phir redeploy

## 1) Razorpay Test keys
1. https://dashboard.razorpay.com/signup (agar account nahi)
2. https://dashboard.razorpay.com/app/keys → **Test Mode** ON
3. Copy:
   - Key ID → `RAZORPAY_KEY_ID` (rzp_test_…)
   - Key Secret → `RAZORPAY_KEY_SECRET`

## 2) MSG91 SMS (India)
1. https://control.msg91.com/signin/
2. Auth key copy → `MSG91_AUTH_KEY`
3. Optional: `MSG91_SENDER_ID` = `SAAFHB` (DLT approved sender better)

## 3) Vercel pe add (ya mujhe keys do, main CLI se laga dunga)
Project: saaf-hisab  
https://vercel.com/roushan-kumars-projects-97d60324/saaf-hisab/settings/environment-variables

Add (Production):
- RAZORPAY_KEY_ID
- RAZORPAY_KEY_SECRET
- MSG91_AUTH_KEY
- MSG91_SENDER_ID = SAAFHB

## 4) Webhook (keys ke baad)
Razorpay → Settings → Webhooks → Add:
- URL: `https://saaf-hisab.vercel.app/api/webhooks/razorpay`
- Event: `payment.captured`
- Secret → `RAZORPAY_WEBHOOK_SECRET` (Vercel env)

## 5) Redeploy
Deployments → Redeploy  
Ya local: `cd ~/Desktop/saaf-hisab && npx vercel --prod`

## Check
https://saaf-hisab.vercel.app/api/config  
→ `razorpayEnabled: true`, `smsLive: true` hona chahiye

---

Made by ROUSHAN KUMAR

