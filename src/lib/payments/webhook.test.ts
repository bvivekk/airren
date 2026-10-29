import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { describe, it } from "node:test";
import { handleRazorpayWebhook, parseRazorpayWebhook, type ParsedRazorpayWebhook } from "./webhook.ts";

const secret = "whsec_test";

function signedRequest(body: string, eventId: string, signature = createHmac("sha256", secret).update(body).digest("hex")): Request {
  return new Request("https://airren.test/api/webhooks/razorpay", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-razorpay-signature": signature,
      "x-razorpay-event-id": eventId,
    },
    body,
  });
}

function memoryProcessor() {
  const seen = new Set<string>();
  const applied: string[] = [];
  return {
    applied,
    async processEvent(event: ParsedRazorpayWebhook): Promise<string> {
      if (seen.has(event.eventId)) {
        return "duplicate";
      }
      seen.add(event.eventId);
      applied.push(`${event.kind}:${event.orderId ?? ""}:${event.paymentId ?? ""}:${event.amountPaise ?? ""}`);
      return "processed";
    },
  };
}

describe("razorpay webhook", () => {
  it("parses captured, failed, and refund events", () => {
    const captured = parseRazorpayWebhook(
      JSON.stringify({
        event: "payment.captured",
        payload: { payment: { entity: { id: "pay_1", order_id: "order_1", amount: 750000, status: "captured" } } },
      }),
      "evt_1",
    );
    assert.equal(captured?.kind, "payment.captured");
    assert.equal(captured?.amountPaise, 750000);
    const failed = parseRazorpayWebhook(
      JSON.stringify({
        event: "payment.failed",
        payload: { payment: { entity: { id: "pay_2", order_id: "order_1", amount: 750000, status: "failed" } } },
      }),
      "evt_2",
    );
    assert.equal(failed?.kind, "payment.failed");
    const refund = parseRazorpayWebhook(
      JSON.stringify({
        event: "refund.processed",
        payload: { refund: { entity: { id: "rfnd_1", payment_id: "pay_1", amount: 750000, status: "processed" } } },
      }),
      "evt_3",
    );
    assert.equal(refund?.kind, "refund.processed");
    assert.equal(refund?.refundId, "rfnd_1");
    assert.equal(refund?.paymentId, "pay_1");
    const partial = parseRazorpayWebhook(
      JSON.stringify({
        event: "refund.processed",
        payload: {
          payment: { entity: { id: "pay_1", order_id: "order_1", amount: 750000 } },
          refund: { entity: { id: "rfnd_2", payment_id: "pay_1", amount: 100000, status: "processed" } },
        },
      }),
      "evt_partial",
    );
    assert.equal(partial?.amountPaise, 100000);
    assert.equal(partial?.kind, "refund.processed");
  });

  it("rejects a bad signature before the event is applied", async () => {
    const processor = memoryProcessor();
    const body = JSON.stringify({
      event: "payment.captured",
      payload: { payment: { entity: { id: "pay_1", order_id: "order_1", amount: 100 } } },
    });
    const response = await handleRazorpayWebhook(signedRequest(body, "evt_1", "deadbeef"), {
      webhookSecret: secret,
      processEvent: processor.processEvent,
    });
    assert.equal(response.status, 400);
    assert.deepEqual(processor.applied, []);
  });

  it("applies a captured payment once when Razorpay retries the same event", async () => {
    const processor = memoryProcessor();
    const body = JSON.stringify({
      event: "payment.captured",
      payload: { payment: { entity: { id: "pay_1", order_id: "order_1", amount: 750000 } } },
    });
    const first = await handleRazorpayWebhook(signedRequest(body, "evt_retry"), {
      webhookSecret: secret,
      processEvent: processor.processEvent,
    });
    const second = await handleRazorpayWebhook(signedRequest(body, "evt_retry"), {
      webhookSecret: secret,
      processEvent: processor.processEvent,
    });
    assert.equal(first.status, 200);
    assert.equal(await first.text(), "processed");
    assert.equal(second.status, 200);
    assert.equal(await second.text(), "duplicate");
    assert.deepEqual(processor.applied, ["payment.captured:order_1:pay_1:750000"]);
  });

  it("rejects a refund failure that has no refund id", async () => {
    const processor = memoryProcessor();
    const body = JSON.stringify({ event: "refund.failed", payload: { refund: { entity: { payment_id: "pay_1" } } } });
    const response = await handleRazorpayWebhook(signedRequest(body, "evt_refund_failed"), {
      webhookSecret: secret,
      processEvent: processor.processEvent,
    });
    assert.equal(response.status, 400);
    assert.deepEqual(processor.applied, []);
  });

  it("is not configured when the webhook secret is missing", async () => {
    const response = await handleRazorpayWebhook(signedRequest("{}", "evt_1"), {
      webhookSecret: null,
      processEvent: async () => "processed",
    });
    assert.equal(response.status, 503);
  });
});
