import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { pickDisplayPayment, type Payment } from "./payment.ts";

function payment(status: Payment["status"], createdAt: string): Payment {
  return {
    id: createdAt,
    bookingId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
    guestId: "user_abc",
    provider: "razorpay",
    orderId: "order_1",
    paymentId: status === "failed" ? null : "pay_1",
    amountPaise: 500_000,
    currency: "INR",
    status,
    createdAt,
    updatedAt: createdAt,
  };
}

describe("pickDisplayPayment", () => {
  it("prefers a captured payment over a later failure", () => {
    const picked = pickDisplayPayment([
      payment("failed", "2026-10-02T00:00:00.000Z"),
      payment("captured", "2026-10-01T00:00:00.000Z"),
    ]);
    assert.equal(picked?.status, "captured");
  });

  it("returns null when the stay has no payments", () => {
    assert.equal(pickDisplayPayment([]), null);
  });
});
