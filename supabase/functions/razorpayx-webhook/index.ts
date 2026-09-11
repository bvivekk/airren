import "@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { getRazorpayEventId } from "../_shared/razorpay-event.ts";
import { verifyWebhookSignature } from "../_shared/razorpayx.ts";

type RazorpayxEvent = {
  event?: string;
};

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return new Response("method not allowed", { status: 405 });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceKey) {
    return new Response("webhook is not configured", { status: 500 });
  }

  const rawBody = await req.text();
  const signature = req.headers.get("x-razorpay-signature") ?? "";
  if (!(await verifyWebhookSignature(rawBody, signature))) {
    return new Response("invalid signature", { status: 400 });
  }

  let event: RazorpayxEvent;
  try {
    event = JSON.parse(rawBody) as RazorpayxEvent;
  } catch {
    return new Response("invalid json", { status: 400 });
  }

  const eventId = getRazorpayEventId(req.headers);
  const eventType = event.event ?? "";
  if (!eventId || !eventType) {
    return new Response("missing event", { status: 400 });
  }

  const admin = createClient(supabaseUrl, serviceKey);
  const { data, error } = await admin.rpc("process_razorpayx_event", {
    p_event_id: eventId,
    p_event_type: eventType,
    p_payload: event,
  });
  if (error) {
    return new Response(error.message, { status: 400 });
  }
  if (data === "failed") {
    return new Response("handler failed", { status: 500 });
  }
  return new Response("ok", { status: 200 });
});
