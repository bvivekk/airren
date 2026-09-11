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
  });
});
