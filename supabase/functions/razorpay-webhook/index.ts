import "@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { signaturesMatch } from "../_shared/hmac.ts";
import { getRazorpayEventId } from "../_shared/razorpay-event.ts";

type RazorpayEvent = {
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
    refund?: {
      entity?: {
        id?: string;
        payment_id?: string;
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

  const eventId = getRazorpayEventId(req.headers);
  const eventType = event.event ?? "";
  if (!eventId || !eventType) {
    return new Response("missing event", { status: 400 });
  }

  const admin = createClient(supabaseUrl, serviceKey);
  const payment = event.payload?.payment?.entity;
  const refund = event.payload?.refund?.entity;
  const orderId = payment?.order_id ?? "";
  const paymentId = payment?.id ?? refund?.payment_id ?? "";
  const amount = payment?.amount ?? refund?.amount;

  if (eventType === "payment.captured") {
    if (!orderId || !paymentId || typeof amount !== "number") {
      return new Response("missing payment fields", { status: 400 });
    }
  } else if (eventType === "payment.failed") {
    if (!orderId) {
      return new Response("missing order", { status: 400 });
    }
  } else if (eventType === "refund.processed" || eventType === "refund.failed") {
    if (!refund?.id) {
      return new Response("missing refund", { status: 400 });
    }
  }

  const { error } = await admin.rpc("process_razorpay_event", {
    p_event_id: eventId,
    p_event_type: eventType,
    p_payload: event,
    p_order_id: orderId || null,
    p_payment_id: paymentId || null,
    p_amount_paise: amount ?? null,
  });
  if (error) {
    return new Response(error.message, { status: 400 });
  }
  return new Response("ok", { status: 200 });
});
