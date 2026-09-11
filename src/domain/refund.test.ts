import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  canGuestCancel,
  checkInInstant,
  quoteHostRefund,
  quoteRefund,
  resolvePolicy,
} from "./refund.ts";

const CHECK_IN = "2026-10-15";
const TOTAL_PAISE = 15_090_000;
const ODD_PAISE = 5;

/** 2026-10-15 15:00 Asia/Kolkata */
const CHECK_IN_AT = checkInInstant(CHECK_IN);

function hoursBeforeCheckIn(hours: number): Date {
  return new Date(CHECK_IN_AT.getTime() - hours * 3_600_000);
}

describe("resolvePolicy", () => {
  it("treats a null listing policy as flexible", () => {
    assert.equal(resolvePolicy(null), "flexible");
  });

  it("keeps a listing override", () => {
    assert.equal(resolvePolicy("strict"), "strict");
  });
});

describe("canGuestCancel", () => {
  it("is open one millisecond before check-in", () => {
    assert.equal(canGuestCancel(new Date(CHECK_IN_AT.getTime() - 1), CHECK_IN), true);
  });

  it("closes at the check-in instant", () => {
    assert.equal(canGuestCancel(CHECK_IN_AT, CHECK_IN), false);
  });
});

describe("quoteRefund", () => {
  it("refunds flexible in full at the 24h cutoff", () => {
    const quote = quoteRefund("flexible", hoursBeforeCheckIn(24), CHECK_IN, TOTAL_PAISE);
    assert.deepEqual(quote, {
      policy: "flexible",
      band: "full",
      refundPaise: 15_090_000,
      keptPaise: 0,
      commissionAfterPaise: 0,
      hostNetAfterPaise: 0,
    });
  });

  it("refunds flexible nothing one millisecond after the 24h cutoff", () => {
    const quote = quoteRefund("flexible", new Date(hoursBeforeCheckIn(24).getTime() + 1), CHECK_IN, TOTAL_PAISE);
    assert.deepEqual(quote, {
      policy: "flexible",
      band: "none",
      refundPaise: 0,
      keptPaise: 15_090_000,
      commissionAfterPaise: 1_509_000,
      hostNetAfterPaise: 13_581_000,
    });
  });

  it("refunds strict half at the 14d cutoff", () => {
    const quote = quoteRefund("strict", hoursBeforeCheckIn(14 * 24), CHECK_IN, TOTAL_PAISE);
    assert.deepEqual(quote, {
      policy: "strict",
      band: "half",
      refundPaise: 7_545_000,
      keptPaise: 7_545_000,
      commissionAfterPaise: 754_500,
      hostNetAfterPaise: 6_790_500,
    });
  });

  it("refunds strict nothing one millisecond after the 14d cutoff", () => {
    const quote = quoteRefund("strict", new Date(hoursBeforeCheckIn(14 * 24).getTime() + 1), CHECK_IN, TOTAL_PAISE);
    assert.deepEqual(quote, {
      policy: "strict",
      band: "none",
      refundPaise: 0,
      keptPaise: 15_090_000,
      commissionAfterPaise: 1_509_000,
      hostNetAfterPaise: 13_581_000,
    });
  });

  it("refunds strict nothing at T-7d", () => {
    const quote = quoteRefund("strict", hoursBeforeCheckIn(7 * 24), CHECK_IN, TOTAL_PAISE);
    assert.equal(quote.band, "none");
    assert.equal(quote.refundPaise, 0);
  });

  it("refunds flexible nothing at the check-in instant", () => {
    const quote = quoteRefund("flexible", CHECK_IN_AT, CHECK_IN, TOTAL_PAISE);
    assert.equal(quote.band, "none");
    assert.equal(quote.refundPaise, 0);
  });

  it("balances guest, commission, and host net on odd paise", () => {
    const quote = quoteRefund("strict", hoursBeforeCheckIn(14 * 24), CHECK_IN, ODD_PAISE);
    assert.deepEqual(quote, {
      policy: "strict",
      band: "half",
      refundPaise: 3,
      keptPaise: 2,
      commissionAfterPaise: 0,
      hostNetAfterPaise: 2,
    });
    assert.equal(quote.refundPaise + quote.commissionAfterPaise + quote.hostNetAfterPaise, ODD_PAISE);
  });
});

describe("quoteHostRefund", () => {
  it("refunds the guest total and zeros host remittance", () => {
    const quote = quoteHostRefund("strict", TOTAL_PAISE);
    assert.deepEqual(quote, {
      policy: "strict",
      band: "full",
      refundPaise: 15_090_000,
      keptPaise: 0,
      commissionAfterPaise: 0,
      hostNetAfterPaise: 0,
    });
  });
});
