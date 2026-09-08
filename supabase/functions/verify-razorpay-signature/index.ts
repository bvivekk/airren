import "@supabase/functions-js/edge-runtime.d.ts";
import { corsHeaders, jsonResponse } from "../_shared/http.ts";
import { signaturesMatch } from "../_shared/hmac.ts";

type VerifyBody = {
  razorpay_order_id?: string;
  razorpay_payment_id?: string;
  razorpay_signature?: string;
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return jsonResponse({ error: "method not allowed" }, 405);
  }

  const secret = Deno.env.get("RAZORPAY_KEY_SECRET");
  if (!secret) {
    return jsonResponse({ error: "razorpay is not configured" }, 500);
  }

  const body = (await req.json()) as VerifyBody;
  const orderId = body.razorpay_order_id ?? "";
  const paymentId = body.razorpay_payment_id ?? "";
  const signature = body.razorpay_signature ?? "";
  if (!orderId || !paymentId || !signature) {
    return jsonResponse({ ok: false }, 400);
  }

  const ok = await signaturesMatch(secret, `${orderId}|${paymentId}`, signature);
  return jsonResponse({ ok });
});
