import type { PaymentProviderId } from "../../domain/payment.ts";
import { verifyRazorpayCheckoutSignature, verifyRazorpayWebhookSignature } from "../razorpay.ts";
import { readRazorpayEnv, type RazorpayEnv } from "./config.ts";
import type {
  CreateGatewayOrder,
  CreateGatewayRefund,
  GatewayOrder,
  GatewayPayment,
  GatewayRefund,
  PaymentGateway,
} from "./types.ts";

type RazorpayErrorBody = {
  error?: { description?: string };
};

class RazorpayRequestError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "RazorpayRequestError";
  }
}

function basicAuth(keyId: string, keySecret: string): string {
  return `Basic ${Buffer.from(`${keyId}:${keySecret}`).toString("base64")}`;
}

async function razorpayFetch<T extends RazorpayErrorBody>(
  fetchImpl: typeof fetch,
  env: RazorpayEnv,
  path: string,
  init: RequestInit,
): Promise<T> {
  const response = await fetchImpl(`https://api.razorpay.com/v1${path}`, {
    ...init,
    headers: {
      Authorization: basicAuth(env.keyId, env.keySecret),
      "Content-Type": "application/json",
      ...(init.headers ?? {}),
    },
  });
  const json = (await response.json()) as T;
  if (!response.ok) {
    throw new RazorpayRequestError(json.error?.description ?? "Razorpay request failed");
  }
  return json;
}

function razorpayGateway(env: RazorpayEnv, fetchImpl: typeof fetch): PaymentGateway {
  return {
    id: "razorpay",
    checkoutKeyId: env.publicKeyId,
    async createOrder(input: CreateGatewayOrder): Promise<GatewayOrder> {
      const json = await razorpayFetch<{ id?: string; amount?: number; currency?: string } & RazorpayErrorBody>(
        fetchImpl,
        env,
        "/orders",
        {
          method: "POST",
          body: JSON.stringify({
            amount: input.amountPaise,
            currency: input.currency,
            receipt: input.receipt,
            payment_capture: true,
            notes: input.notes,
          }),
        },
      );
      if (!json.id || json.amount !== input.amountPaise || json.currency !== "INR") {
        throw new RazorpayRequestError("Razorpay order did not match the stay total");
      }
      return { id: json.id, amountPaise: json.amount, currency: json.currency };
    },
    verifyCheckoutSignature(orderId: string, paymentId: string, signature: string): boolean {
      return verifyRazorpayCheckoutSignature(orderId, paymentId, signature, env.keySecret);
    },
    verifyWebhookSignature(rawBody: string, signature: string): boolean {
      return verifyRazorpayWebhookSignature(rawBody, signature, env.webhookSecret);
    },
    async fetchPayment(paymentId: string): Promise<GatewayPayment> {
      const json = await razorpayFetch<{
        id?: string;
        order_id?: string;
        amount?: number;
        currency?: string;
        status?: string;
      } & RazorpayErrorBody>(fetchImpl, env, `/payments/${encodeURIComponent(paymentId)}`, { method: "GET" });
      if (!json.id || !json.order_id || typeof json.amount !== "number" || !json.currency || !json.status) {
        throw new RazorpayRequestError("Razorpay payment was incomplete");
      }
      return {
        id: json.id,
        orderId: json.order_id,
        amountPaise: json.amount,
        currency: json.currency,
        status: json.status,
      };
    },
    async createRefund(input: CreateGatewayRefund): Promise<GatewayRefund> {
      try {
        const created = await razorpayFetch<{ id?: string } & RazorpayErrorBody>(
          fetchImpl,
          env,
          `/payments/${encodeURIComponent(input.paymentId)}/refund`,
          {
            method: "POST",
            headers: { "Idempotency-Key": input.idempotencyKey },
            body: JSON.stringify({ amount: input.amountPaise, receipt: input.receipt }),
          },
        );
        if (!created.id) {
          throw new RazorpayRequestError("Razorpay refund was incomplete");
        }
        return { id: created.id };
      } catch (cause) {
        const listed = await razorpayFetch<{ items?: Array<{ id?: string; receipt?: string | null }> } & RazorpayErrorBody>(
          fetchImpl,
          env,
          `/payments/${encodeURIComponent(input.paymentId)}/refunds?count=100`,
          { method: "GET" },
        );
        const existing = listed.items?.find((item) => item.receipt === input.receipt && item.id);
        if (existing?.id) {
          return { id: existing.id };
        }
        throw cause;
      }
    },
  };
}

export function createRazorpayGateway(env: RazorpayEnv | null, fetchImpl: typeof fetch = fetch): PaymentGateway | null {
  if (!env) {
    return null;
  }
  return razorpayGateway(env, fetchImpl);
}

export function paymentGateway(provider: PaymentProviderId, env: NodeJS.ProcessEnv = process.env): PaymentGateway | null {
  switch (provider) {
    case "razorpay":
      return createRazorpayGateway(readRazorpayEnv(env));
    case "stripe":
      return null;
    default: {
      const _never: never = provider;
      return _never;
    }
  }
}
