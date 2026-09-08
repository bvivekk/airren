import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createHmac } from "node:crypto";
import { verifyRazorpayCheckoutSignature, verifyRazorpayWebhookSignature } from "./razorpay.ts";

describe("razorpay signatures", () => {
  it("accepts a matching webhook HMAC and rejects a bad one", () => {
    const body = '{"event":"payment.captured"}';
    const secret = "whsec_test";
    const signature = createHmac("sha256", secret).update(body).digest("hex");
    assert.equal(verifyRazorpayWebhookSignature(body, signature, secret), true);
    assert.equal(verifyRazorpayWebhookSignature(body, "0".repeat(signature.length), secret), false);
  });

  it("accepts a matching checkout HMAC", () => {
    const secret = "key_secret";
    const signature = createHmac("sha256", secret).update("order_1|pay_1").digest("hex");
    assert.equal(verifyRazorpayCheckoutSignature("order_1", "pay_1", signature, secret), true);
    assert.equal(verifyRazorpayCheckoutSignature("order_1", "pay_2", signature, secret), false);
  });
});
