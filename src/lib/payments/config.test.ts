import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { paymentsConfigured, readRazorpayEnv } from "./config.ts";

const complete = {
  RAZORPAY_KEY_ID: "rzp_test_key",
  RAZORPAY_KEY_SECRET: "secret",
  RAZORPAY_WEBHOOK_SECRET: "whsec",
  NEXT_PUBLIC_RAZORPAY_KEY_ID: "rzp_test_key",
  SUPABASE_SERVICE_ROLE_KEY: "service",
  NEXT_PUBLIC_SUPABASE_URL: "http://127.0.0.1:54321",
};

describe("paymentsConfigured", () => {
  it("is ready only when the public key matches the secret key id and Supabase can confirm payments", () => {
    assert.equal(paymentsConfigured(complete), true);
    assert.deepEqual(readRazorpayEnv(complete)?.keyId, "rzp_test_key");
  });

  it("stays off when any Razorpay secret is missing", () => {
    const rest = { ...complete, RAZORPAY_KEY_SECRET: "" };
    assert.equal(paymentsConfigured(rest), false);
    assert.equal(readRazorpayEnv(rest), null);
  });

  it("stays off when the publishable key id does not match the server key", () => {
    assert.equal(paymentsConfigured({ ...complete, NEXT_PUBLIC_RAZORPAY_KEY_ID: "rzp_test_other" }), false);
  });
});
