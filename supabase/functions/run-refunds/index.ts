import "@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { createRefund } from "../_shared/razorpay-refunds.ts";

type ClaimedRefund = {
  id?: string;
  booking_id?: string;
  razorpay_payment_id?: string;
  amount_paise?: number;
  receipt?: string;
};

function cronAuthorized(req: Request): boolean {
  const secret = Deno.env.get("REFUNDS_CRON_SECRET") ?? "";
  if (!secret) {
    return false;
  }
  return req.headers.get("x-airren-cron-secret") === secret;
}

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return new Response("method not allowed", { status: 405 });
  }
  if (!cronAuthorized(req)) {
    return new Response("unauthorized", { status: 401 });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceKey) {
    return new Response("refunds are not configured", { status: 500 });
  }
  if (!Deno.env.get("RAZORPAY_KEY_ID") || !Deno.env.get("RAZORPAY_KEY_SECRET")) {
    return new Response("RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET are not configured", { status: 500 });
  }

  const admin = createClient(supabaseUrl, serviceKey);
  const { data, error } = await admin.rpc("claim_pending_refunds", { p_limit: 25 });
  if (error) {
    console.error("claim_pending_refunds", error.message);
    return new Response(error.message, { status: 400 });
  }

  const claimed = (Array.isArray(data) ? data : []) as ClaimedRefund[];
  let submitted = 0;
  let failed = 0;
  for (const refund of claimed) {
    if (
      !refund.id ||
      !refund.razorpay_payment_id ||
      !refund.receipt ||
      typeof refund.amount_paise !== "number"
    ) {
      failed += 1;
      continue;
    }
    try {
      const created = await createRefund({
        razorpayPaymentId: refund.razorpay_payment_id,
        amountPaise: refund.amount_paise,
        receipt: refund.receipt,
        idempotencyKey: refund.id,
      });
      const { error: recordError } = await admin.rpc("record_refund_submitted", {
        p_refund_id: refund.id,
        p_razorpay_refund_id: created.razorpayRefundId,
      });
      if (recordError) {
        throw new Error(recordError.message);
      }
      submitted += 1;
    } catch (cause) {
      failed += 1;
      console.error("run-refunds item", refund.id, cause instanceof Error ? cause.message : cause);
    }
  }

  return Response.json({ claimed: claimed.length, submitted, failed });
});
