import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { parseBooking } from "./bookings-repo.ts";

describe("parseBooking", () => {
  it("maps a PostgREST booking row", () => {
    const booking = parseBooking({
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
      expires_at: "2026-10-01T12:00:00.000Z",
      status: "pending_payment",
      canceled_at: null,
      canceled_by: null,
      created_at: "2026-09-08T12:00:00.000Z",
      homes: { name: "Sterling Canopy", slug: "sterling-canopy" },
    });
    assert.equal(booking.homeName, "Sterling Canopy");
    assert.equal(booking.nights, 3);
    assert.equal(booking.totalPaise, 15_090_000);
    assert.equal(booking.status, "pending_payment");
    assert.equal(booking.canceledAt, null);
    assert.equal(booking.canceledBy, null);
  });

  it("maps a canceled stay", () => {
    const booking = parseBooking({
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
      status: "canceled",
      canceled_at: "2026-09-11T12:00:00.000Z",
      canceled_by: "guest",
      created_at: "2026-09-08T12:00:00.000Z",
      homes: { name: "Sterling Canopy", slug: "sterling-canopy" },
    });
    assert.equal(booking.status, "canceled");
    assert.equal(booking.canceledAt, "2026-09-11T12:00:00.000Z");
    assert.equal(booking.canceledBy, "guest");
  });
});
