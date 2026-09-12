import "@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { createPayout } from "../_shared/razorpayx.ts";

type ClaimedPayout = {
  id?: string;
  booking_id?: string;
  amount_paise?: number;
  fund_account_id?: string;
  method?: string;
};

function parseMethod(value: unknown): "bank_account" | "vpa" {
  if (value === "bank_account" || value === "vpa") {
    return value;
  }
  throw new Error("claimed payout method is invalid");
}

function cronAuthorized(req: Request): boolean {
  const secret = Deno.env.get("PAYOUTS_CRON_SECRET") ?? "";
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
    return new Response("payouts are not configured", { status: 500 });
  }
  if (
    !Deno.env.get("RAZORPAYX_KEY_ID") ||
    !Deno.env.get("RAZORPAYX_KEY_SECRET") ||
    !Deno.env.get("RAZORPAYX_ACCOUNT_NUMBER")
  ) {
    return new Response("RAZORPAYX_KEY_ID, RAZORPAYX_KEY_SECRET, and RAZORPAYX_ACCOUNT_NUMBER are not configured", {
      status: 500,
    });
  }

  const admin = createClient(supabaseUrl, serviceKey);
  const { data, error } = await admin.rpc("claim_due_payouts", { p_limit: 25 });
  if (error) {
    console.error("claim_due_payouts", error.message);
    return new Response(error.message, { status: 400 });
  }

  const claimed = (Array.isArray(data) ? data : []) as ClaimedPayout[];
  let initiated = 0;
  let failed = 0;
  for (const payout of claimed) {
    if (!payout.id || !payout.booking_id || !payout.fund_account_id || typeof payout.amount_paise !== "number") {
      failed += 1;
      continue;
    }
    try {
      const result = await createPayout({
        idempotencyKey: payout.id,
        fundAccountId: payout.fund_account_id,
        amountPaise: payout.amount_paise,
        referenceId: payout.booking_id,
        method: parseMethod(payout.method),
      });
      const { error: recordError } = await admin.rpc("record_payout_initiated", {
        p_payout_id: payout.id,
        p_razorpayx_payout_id: result.razorpayxPayoutId,
      });
      if (recordError) {
        throw new Error(recordError.message);
      }
      initiated += 1;
    } catch (cause) {
      failed += 1;
      console.error("run-payouts item", payout.id, cause instanceof Error ? cause.message : cause);
    }
  }

  return Response.json({ claimed: claimed.length, initiated, failed });
});
