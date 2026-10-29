# Airren

Luxury stays with a guest-first loop. Search, sign in, and pay for a stay in INR with Razorpay, including Google Pay and PhonePe on a phone.

## Local

```bash
npm install
npx supabase start
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Copy `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` from `supabase start` into `.env.local`.

Guest checkout runs in the Next.js app. Copy the Razorpay and Supabase values below into `.env.local`. Leave the Razorpay values empty to run the app with payments turned off: Reserve stays disabled and no order is created.

```
NEXT_PUBLIC_RAZORPAY_KEY_ID=
RAZORPAY_KEY_ID=
RAZORPAY_KEY_SECRET=
RAZORPAY_WEBHOOK_SECRET=
RAZORPAY_MODE=
SUPABASE_SERVICE_ROLE_KEY=
```

`NEXT_PUBLIC_RAZORPAY_KEY_ID` and `RAZORPAY_KEY_ID` are the same key id. Leave `RAZORPAY_MODE` empty or set it to `test` for `rzp_test_` keys. Live keys (`rzp_live_`) stay disabled until `RAZORPAY_MODE=live`. The key secret and webhook secret stay on the server, and they are different values. `SUPABASE_SERVICE_ROLE_KEY` lets the app confirm a booking after the payment signature checks out. Never commit live or test secrets.

In the Razorpay dashboard, switch to **Test mode** and create API keys. Add one webhook pointing at `https://<your-host>/api/webhooks/razorpay` (locally, expose port 3000 with a tunnel). Subscribe to `payment.captured`, `payment.failed`, `refund.processed`, and `refund.failed`. Set payment capture to **Automatic**. The test-mode webhook OTP is `754081`. The signature header is `X-Razorpay-Signature`. A failed attempt keeps the 15 minute hold so a later capture on the same order can still confirm the stay. A capture that arrives after the hold has expired still confirms when those dates are free.

Pay a stay from a home page. Checkout opens Razorpay for UPI, cards, and netbanking. The server prices the stay from the nightly rate, and the booking stays `pending_payment` until that signature is verified or the webhook captures the payment. A confirmed stay can be canceled from the trip page; a refundable cancel is sent to Razorpay as a refund for the amount stored on the cancellation, which is the full charge when the policy says so.

Test mode does not move real money:

- UPI success: `success@razorpay`
- UPI failure: `failure@razorpay`
- Domestic cards (any future expiry, any CVV): Visa `4100 2800 0000 1007`, Mastercard `5500 6700 0000 1002`, RuPay `6527 6589 0000 1005`. The test checkout shows a mock bank page with success and failure buttons.

Live mode needs Razorpay KYC, a live key pair, a live webhook secret, and `RAZORPAY_MODE=live` on the Next.js host and on the Supabase function secrets. Set `RAZORPAY_KEY_ID`, `NEXT_PUBLIC_RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, and `RAZORPAY_WEBHOOK_SECRET` together from that same live mode. International cards are a later Stripe provider; only Razorpay is implemented.

Host payouts and the refund worker still use Edge Functions when you run them:

```bash
npx supabase functions serve --no-verify-jwt
```

Set `CLERK_JWT_ISSUER` for those functions. The functions webhook remains `/functions/v1/razorpay-webhook` if you deploy functions; the Next.js webhook above is the one the app uses, and repeated deliveries of the same event are ignored.

```bash
npm test
npx supabase db test --local
npm run lint
npm run build
```

## Preview

Preview: [https://airren-rjk1995ig-bvivekks-projects.vercel.app](https://airren-rjk1995ig-bvivekks-projects.vercel.app)

Production was not promoted. The older production deploy is unchanged.
