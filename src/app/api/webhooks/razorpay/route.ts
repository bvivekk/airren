import { paymentsConfigured, readRazorpayEnv } from "@/lib/payments/config";
import { handleRazorpayWebhook } from "@/lib/payments/webhook";
import { createServiceClient } from "@/lib/supabase/service";

export const runtime = "nodejs";

export async function POST(request: Request): Promise<Response> {
  if (!paymentsConfigured()) {
    return new Response("webhook is not configured", { status: 503 });
  }
  const env = readRazorpayEnv();
  const admin = createServiceClient();
  if (!env || !admin) {
    return new Response("webhook is not configured", { status: 503 });
  }
  return handleRazorpayWebhook(request, {
    webhookSecret: env.webhookSecret,
    processEvent: async (event) => {
      const { data, error } = await admin.rpc("process_razorpay_event", {
        p_event_id: event.eventId,
        p_event_type: event.eventType,
        p_payload: event.payload,
        p_order_id: event.orderId,
        p_payment_id: event.paymentId,
        p_amount_paise: event.amountPaise,
      });
      if (error) {
        throw new Error(error.message);
      }
      return typeof data === "string" ? data : "processed";
    },
  });
}
