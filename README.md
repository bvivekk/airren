# Airren

Luxury stays with a guest-first loop. Search, sign in, and pay for a stay in INR with Razorpay, including Google Pay and PhonePe on a phone.

## Local

```bash
npm install
npx supabase start
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Copy `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` from `supabase start` into `.env.local`.

Checkout needs Edge Functions and Razorpay test secrets:

```bash
npx supabase functions serve --no-verify-jwt
```

Set `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET`, `CLERK_JWT_ISSUER`, and `NEXT_PUBLIC_RAZORPAY_KEY_ID` locally. The webhook URL is `/functions/v1/razorpay-webhook`.

```bash
npm test
npx supabase db test --local
npm run lint
npm run build
```

## Preview

Preview: [https://airren-rjk1995ig-bvivekks-projects.vercel.app](https://airren-rjk1995ig-bvivekks-projects.vercel.app)

Production was not promoted. The older production deploy is unchanged.
