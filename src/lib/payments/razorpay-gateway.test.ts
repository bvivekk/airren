import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { describe, it } from "node:test";
import type { RazorpayEnv } from "./config.ts";
import { createRazorpayGateway, paymentGateway } from "./razorpay-gateway.ts";

const env: RazorpayEnv = {
  keyId: "rzp_test_key",
  keySecret: "key_secret",
  webhookSecret: "whsec_test",
  publicKeyId: "rzp_test_key",
};

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}

describe("razorpay gateway", () => {
  it("creates an order for the server amount", async () => {
    const calls: Array<{ url: string; body: string }> = [];
    const fetchImpl: typeof fetch = async (input, init) => {
      calls.push({ url: String(input), body: String(init?.body ?? "") });
      return jsonResponse({ id: "order_1", amount: 750_000, currency: "INR" });
    };
    const gateway = createRazorpayGateway(env, fetchImpl);
    const order = await gateway?.createOrder({
      amountPaise: 750_000,
      currency: "INR",
      receipt: "stay_abc",
      notes: { home_id: "home_1" },
    });
    assert.equal(order?.id, "order_1");
    assert.equal(JSON.parse(calls[0].body).amount, 750_000);
    assert.equal(calls[0].url, "https://api.razorpay.com/v1/orders");
  });

  it("rejects an order whose amount does not match the stay", async () => {
    const fetchImpl: typeof fetch = async () => jsonResponse({ id: "order_1", amount: 1, currency: "INR" });
    const gateway = createRazorpayGateway(env, fetchImpl);
    await assert.rejects(() =>
      gateway?.createOrder({ amountPaise: 750_000, currency: "INR", receipt: "stay_abc", notes: {} }),
    );
  });

  it("verifies checkout and webhook signatures with the server secrets", () => {
    const gateway = createRazorpayGateway(env);
    const checkout = createHmac("sha256", env.keySecret).update("order_1|pay_1").digest("hex");
    assert.equal(gateway?.verifyCheckoutSignature("order_1", "pay_1", checkout), true);
    assert.equal(gateway?.verifyCheckoutSignature("order_1", "pay_2", checkout), false);
    const body = "{\"event\":\"payment.captured\"}";
    const webhook = createHmac("sha256", env.webhookSecret).update(body).digest("hex");
    assert.equal(gateway?.verifyWebhookSignature(body, webhook), true);
    assert.equal(gateway?.verifyWebhookSignature(body, "0".repeat(webhook.length)), false);
  });

  it("refunds the amount the server claimed and reuses a receipt that already exists", async () => {
    const calls: Array<{ url: string; init: RequestInit | undefined }> = [];
    const fetchImpl: typeof fetch = async (input, init) => {
      calls.push({ url: String(input), init });
      if (String(input).endsWith("/refund")) {
        return jsonResponse({ error: { description: "duplicate" } }, 400);
      }
      return jsonResponse({ items: [{ id: "rfnd_1", receipt: "refund-receipt" }] });
    };
    const gateway = createRazorpayGateway(env, fetchImpl);
    const refund = await gateway?.createRefund({
      paymentId: "pay_1",
      amountPaise: 750_000,
      receipt: "refund-receipt",
      idempotencyKey: "refund-1",
    });
    assert.equal(refund?.id, "rfnd_1");
    assert.equal(JSON.parse(String(calls[0].init?.body)).amount, 750_000);
    const headers = new Headers(calls[0].init?.headers);
    assert.equal(headers.get("Idempotency-Key"), "refund-1");
  });

  it("leaves Stripe unimplemented", () => {
    assert.equal(paymentGateway("stripe", {}), null);
    assert.equal(paymentGateway("razorpay", {}), null);
  });
});
