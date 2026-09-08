import "@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { signaturesMatch } from "../_shared/hmac.ts";

type RazorpayEvent = {
  id?: string;
  event?: string;
  payload?: {
    payment?: {
      entity?: {
        id?: string;
        order_id?: string;
        amount?: number;
        status?: string;
      };
    };
  };
};

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return new Response("method not allowed", { status: 405 });
  }

  const secret = Deno.env.get("RAZORPAY_WEBHOOK_SECRET");
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!secret || !supabaseUrl || !serviceKey) {
    return new Response("webhook is not configured", { status: 500 });
  }

  const rawBody = await req.text();
  const signature = req.headers.get("x-razorpay-signature") ?? "";
  if (!(await signaturesMatch(secret, rawBody, signature))) {
    return new Response("invalid signature", { status: 400 });
  }

  let event: RazorpayEvent;
  try {
    event = JSON.parse(rawBody) as RazorpayEvent;
  } catch {
    return new Response("invalid json", { status: 400 });
  }

  const eventId = event.id ?? "";
  const eventType = event.event ?? "";
  if (!eventId || !eventType) {
    return new Response("missing event", { status: 400 });
  }

  const admin = createClient(supabaseUrl, serviceKey);
  const { error: insertError } = await admin.from("razorpay_events").insert({
    id: eventId,
    event_type: eventType,
    payload: event,
  });
  if (insertError) {
    if (insertError.code === "23505") {
      return new Response("ok", { status: 200 });
    }
    return new Response(insertError.message, { status: 500 });
  }

  const payment = event.payload?.payment?.entity;
  const orderId = payment?.order_id ?? "";
  const paymentId = payment?.id ?? "";
  const amount = payment?.amount;

  if (eventType === "payment.captured") {
    if (!orderId || !paymentId || typeof amount !== "number") {
      return new Response("missing payment fields", { status: 400 });
    }
    const { error } = await admin.rpc("confirm_booking", {
      p_order_id: orderId,
      p_payment_id: paymentId,
      p_amount_paise: amount,
    });
    if (error) {
      if (error.message.includes("amount mismatch")) {
        return new Response("ok", { status: 200 });
      }
      return new Response(error.message, { status: 400 });
    }
    return new Response("ok", { status: 200 });
  }

  if (eventType === "payment.failed") {
    if (!orderId) {
      return new Response("missing order", { status: 400 });
    }
    const { error } = await admin.rpc("fail_booking", { p_order_id: orderId });
    if (error) {
      return new Response(error.message, { status: 400 });
    }
    return new Response("ok", { status: 200 });
  }

  return new Response("ok", { status: 200 });
});
