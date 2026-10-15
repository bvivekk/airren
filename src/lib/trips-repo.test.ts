import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { parseTrip } from "./trips-repo.ts";

const baseRow = {
  id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
  home_id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
  guest_id: "user_abc",
  check_in: "2026-10-01",
  check_out: "2026-10-04",
  guests: 2,
  nights: 3,
  subtotal_paise: 15090000,
  total_paise: 15090000,
  razorpay_order_id: "order_1",
  expires_at: null,
  created_at: "2026-09-08T12:00:00.000Z",
};

describe("parseTrip", () => {
  it("defaults a null listing policy to flexible", () => {
    const trip = parseTrip({
      ...baseRow,
      status: "confirmed",
      canceled_at: null,
      canceled_by: null,
      homes: { name: "Sterling Canopy", slug: "sterling-canopy", cancellation_policy: null },
      refunds: null,
    });
    assert.equal(trip.policy, "flexible");
    assert.equal(trip.refund, null);
    assert.equal(trip.payment, null);
    assert.equal(trip.booking.status, "confirmed");
  });

  it("maps a canceled stay and its refund", () => {
    const trip = parseTrip({
      ...baseRow,
      status: "canceled",
      canceled_at: "2026-09-11T12:00:00.000Z",
      canceled_by: "guest",
      homes: { name: "Sterling Canopy", slug: "sterling-canopy", cancellation_policy: "strict" },
      refunds: {
        id: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
        booking_id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
        amount_paise: 7545000,
        status: "requested",
        actor: "guest",
        policy_applied: "strict",
        razorpay_refund_id: null,
      },
    });
    assert.equal(trip.policy, "strict");
    assert.deepEqual(trip.refund, {
      id: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
      bookingId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
      amountPaise: 7_545_000,
      status: "requested",
      actor: "guest",
      policyApplied: "strict",
      razorpayRefundId: null,
    });
    assert.equal(trip.payment, null);
  });

  it("shows the captured payment ahead of a failed attempt", () => {
    const trip = parseTrip({
      ...baseRow,
      status: "confirmed",
      canceled_at: null,
      canceled_by: null,
      homes: { name: "Sterling Canopy", slug: "sterling-canopy", cancellation_policy: "flexible" },
      refunds: null,
      payments: [
        {
          id: "dddddddd-dddd-4ddd-8ddd-dddddddddddd",
          booking_id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
          guest_id: "user_abc",
          provider: "razorpay",
          provider_order_id: "order_1",
          provider_payment_id: null,
          razorpay_order_id: "order_1",
          razorpay_payment_id: null,
          amount_paise: 15090000,
          currency: "INR",
          status: "failed",
          created_at: "2026-10-02T00:00:00.000Z",
          updated_at: "2026-10-02T00:00:00.000Z",
        },
        {
          id: "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee",
          booking_id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
          guest_id: "user_abc",
          provider: "razorpay",
          provider_order_id: "order_1",
          provider_payment_id: "pay_1",
          razorpay_order_id: "order_1",
          razorpay_payment_id: "pay_1",
          amount_paise: 15090000,
          currency: "INR",
          status: "captured",
          created_at: "2026-10-01T00:00:00.000Z",
          updated_at: "2026-10-01T00:00:00.000Z",
        },
      ],
    });
    assert.equal(trip.payment?.status, "captured");
    assert.equal(trip.payment?.paymentId, "pay_1");
    assert.equal(trip.payment?.currency, "INR");
    assert.equal(trip.payment?.guestId, "user_abc");
  });
});
