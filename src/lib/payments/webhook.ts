import { verifyRazorpayWebhookSignature } from "../razorpay.ts";

export type RazorpayWebhookKind =
  | "payment.captured"
  | "payment.failed"
  | "refund.processed"
  | "refund.failed"
  | "ignored";

export type ParsedRazorpayWebhook = {
  eventId: string;
  eventType: string;
  kind: RazorpayWebhookKind;
  orderId: string | null;
  paymentId: string | null;
  amountPaise: number | null;
  refundId: string | null;
  payload: unknown;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function stringOrNull(value: unknown): string | null {
  return typeof value === "string" && value.length > 0 ? value : null;
}

function amountOrNull(value: unknown): number | null {
  return typeof value === "number" && Number.isInteger(value) ? value : null;
}

export function webhookKind(eventType: string): RazorpayWebhookKind {
  switch (eventType) {
    case "payment.captured":
    case "payment.failed":
    case "refund.processed":
    case "refund.failed":
      return eventType;
    default:
      return "ignored";
  }
}

export function parseRazorpayWebhook(rawBody: string, eventId: string): ParsedRazorpayWebhook | null {
  let payload: unknown;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return null;
  }
  if (!isRecord(payload)) {
    return null;
  }
  const eventType = stringOrNull(payload.event) ?? "";
  const kind = webhookKind(eventType);
  const nested = isRecord(payload.payload) ? payload.payload : null;
  const paymentEntity = isRecord(nested?.payment) && isRecord(nested.payment.entity) ? nested.payment.entity : null;
  const refundEntity = isRecord(nested?.refund) && isRecord(nested.refund.entity) ? nested.refund.entity : null;
  const refundAmount = amountOrNull(refundEntity?.amount);
  const paymentAmount = amountOrNull(paymentEntity?.amount);
  const refundEvent = kind === "refund.processed" || kind === "refund.failed";
  const amountPaise = refundEvent ? refundAmount ?? paymentAmount : paymentAmount ?? refundAmount;
  return {
    eventId,
    eventType,
    kind,
    orderId: stringOrNull(paymentEntity?.order_id) ?? stringOrNull(refundEntity?.order_id),
    paymentId: stringOrNull(paymentEntity?.id) ?? stringOrNull(refundEntity?.payment_id),
    amountPaise,
    refundId: stringOrNull(refundEntity?.id),
    payload,
  };
}

export type WebhookDeps = {
  webhookSecret: string | null;
  processEvent: (event: ParsedRazorpayWebhook) => Promise<string>;
};

function text(body: string, status: number): Response {
  return new Response(body, { status });
}

export async function handleRazorpayWebhook(request: Request, deps: WebhookDeps): Promise<Response> {
  if (request.method !== "POST") {
    return text("method not allowed", 405);
  }
  if (!deps.webhookSecret) {
    return text("webhook is not configured", 503);
  }
  const rawBody = await request.text();
  const signature = request.headers.get("x-razorpay-signature") ?? "";
  if (!verifyRazorpayWebhookSignature(rawBody, signature, deps.webhookSecret)) {
    return text("invalid signature", 400);
  }
  const eventId = request.headers.get("x-razorpay-event-id") ?? "";
  const parsed = parseRazorpayWebhook(rawBody, eventId);
  if (!parsed) {
    return text("invalid json", 400);
  }
  if (!parsed.eventId || !parsed.eventType) {
    return text("missing event", 400);
  }
  if (parsed.kind === "payment.captured" && (!parsed.orderId || !parsed.paymentId || parsed.amountPaise === null)) {
    return text("missing payment fields", 400);
  }
  if (parsed.kind === "payment.failed" && !parsed.orderId) {
    return text("missing order", 400);
  }
  if ((parsed.kind === "refund.processed" || parsed.kind === "refund.failed") && !parsed.refundId) {
    return text("missing refund", 400);
  }
  try {
    const result = await deps.processEvent(parsed);
    return text(result, 200);
  } catch (error) {
    console.error("razorpay webhook", error instanceof Error ? error.message : error);
    return text("webhook failed", 500);
  }
}
