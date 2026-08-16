# SAAF Hisāb

Event transparency app — Next.js + Prisma + PostgreSQL.

## Local

```bash
cd ~/Desktop/saaf-hisab
cp .env.example .env
# Set DATABASE_URL (Postgres) + npm run db:setup
npm install
npm run db:setup
npm run dev
```

Demo OTP (no SMS keys): `1234`  
Setup keys UI: http://localhost:3000/setup

## Deploy (Vercel)

### 1. Database
- Prefer [Neon](https://neon.tech) free Postgres, **or**
- Claim temp Prisma DB (if you used `create-db`) before it expires.

### 2. Login + deploy

```bash
cd ~/Desktop/saaf-hisab
npx vercel login
npx vercel          # preview
npx vercel --prod   # production
```

### 3. Env vars (Vercel → Project → Settings → Environment Variables)

| Name | Value |
|------|--------|
| `DATABASE_URL` | Postgres connection string |
| `NEXT_PUBLIC_APP_URL` | `https://your-app.vercel.app` |
| `DEMO_OTP` | `1234` (until SMS live) |
| Razorpay / SMS | optional until Phase 2 live |

After first deploy, seed once:

```bash
DATABASE_URL="..." NEXT_PUBLIC_APP_URL="https://..." npm run db:seed
```

Or open the empty app and create your first event.

### 4. Webhook
`https://YOUR-APP.vercel.app/api/webhooks/razorpay` → event `payment.captured`

## Notes
- SQLite removed — production needs Postgres.
- `vercel-build` runs `prisma db push` on each deploy (MVP-friendly).
