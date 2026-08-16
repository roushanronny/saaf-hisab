# Deploy checklist

## Done in repo
- Prisma switched to **PostgreSQL**
- Temp Prisma Postgres created + schema pushed + seed
- `vercel.json` + `vercel-build` script
- Anonymous preview deployed (claim quickly)

## Tumhe abhi karna hai (2–5 min)

### A) Claim database (24h expiry if unclaimed)
Open:
https://create-db.prisma.io/claim?projectID=proj_a7lslgbmequkd6yiibtxcb35

### B) Claim Vercel site (~59 min expiry if unclaimed)
1. Open: https://vercel.com/claim-deployment?code=43c72292-b99b-4bc9-bdc4-76851393420e
2. Temp URL: https://temporary-flying-bayou-4rhahv5.vercel.app
3. Vercel project → **Settings → Environment Variables** add:
   - `DATABASE_URL` = same value as local `.env`
   - `NEXT_PUBLIC_APP_URL` = your vercel URL
   - `DEMO_OTP` = `1234`
4. **Redeploy** (Deployments → … → Redeploy)

Without `DATABASE_URL` on Vercel, `/events` returns 500 (home may still load).

### C) Permanent setup (recommended)
```bash
cd ~/Desktop/saaf-hisab
npx vercel login
npx vercel --prod
```
Phir same env vars set karo.

Optional better DB: Neon free → new `DATABASE_URL` → `npm run db:setup` → update Vercel env.
