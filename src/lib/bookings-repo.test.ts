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
      service_fee_paise: 754500,
      cleaning_fee_paise: 1200000,
      total_paise: 17044500,
      razorpay_order_id: "order_1",
      expires_at: "2026-10-01T12:00:00.000Z",
      status: "pending_payment",
      created_at: "2026-09-08T12:00:00.000Z",
      homes: { name: "Sterling Canopy", slug: "sterling-canopy" },
    });
    assert.equal(booking.homeName, "Sterling Canopy");
    assert.equal(booking.nights, 3);
    assert.equal(booking.status, "pending_payment");
  });
});
