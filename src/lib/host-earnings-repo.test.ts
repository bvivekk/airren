import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { parseHostEarning, parseHostPayoutAccount, payoutStatusLabel } from "./host-earnings-repo.ts";

describe("parseHostEarning", () => {
  it("maps a list_host_earnings row", () => {
    const earning = parseHostEarning({
      booking_id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
      home_name: "Sterling Canopy",
      check_in: "2026-10-01",
      check_out: "2026-10-04",
      nights: 3,
      subtotal_paise: 15090000,
      commission_paise: 1509000,
      host_net_paise: 13581000,
      payout_status: "scheduled",
      eligible_at: "2026-10-02T08:30:00.000Z",
      paid_at: null,
    });
    assert.deepEqual(earning, {
      bookingId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
      homeName: "Sterling Canopy",
      checkIn: "2026-10-01",
      checkOut: "2026-10-04",
      nights: 3,
      subtotalPaise: 15_090_000,
      commissionPaise: 1_509_000,
      hostNetPaise: 13_581_000,
      payoutStatus: "scheduled",
      eligibleAt: "2026-10-02T08:30:00.000Z",
      paidAt: null,
    });
  });
});

describe("parseHostPayoutAccount", () => {
  it("maps the host-visible account columns", () => {
    assert.deepEqual(
      parseHostPayoutAccount({
        method: "vpa",
        label: "priya@ok···",
        updated_at: "2026-09-11T04:00:00.000Z",
      }),
      {
        method: "vpa",
        label: "priya@ok···",
        updatedAt: "2026-09-11T04:00:00.000Z",
      },
    );
  });
});

describe("payoutStatusLabel", () => {
  it("names a paid row", () => {
    assert.equal(payoutStatusLabel("paid"), "Paid");
  });
});
