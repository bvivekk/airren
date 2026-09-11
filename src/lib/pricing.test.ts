import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { hostEarningsFor, quoteStay } from "./pricing.ts";

describe("quoteStay", () => {
  it("prices three nights with no guest fees", () => {
    const quote = quoteStay(5_030_000, 3);
    assert.deepEqual(quote, {
      nights: 3,
      subtotalPaise: 15_090_000,
      totalPaise: 15_090_000,
    });
  });

  it("is zero when nights are not positive", () => {
    assert.deepEqual(quoteStay(1_000_000, 0), {
      nights: 0,
      subtotalPaise: 0,
      totalPaise: 0,
    });
  });
});

describe("hostEarningsFor", () => {
  it("keeps 10 percent and derives net by subtraction", () => {
    assert.deepEqual(hostEarningsFor(15_090_000), {
      commissionPaise: 1_509_000,
      hostNetPaise: 13_581_000,
    });
  });

  it("rounds half up and still balances", () => {
    assert.deepEqual(hostEarningsFor(5), {
      commissionPaise: 1,
      hostNetPaise: 4,
    });
  });
});
