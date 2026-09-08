import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { quoteStay } from "./pricing.ts";

describe("quoteStay", () => {
  it("prices three nights plus fees", () => {
    const quote = quoteStay(5_030_000, 3);
    assert.equal(quote.nights, 3);
    assert.equal(quote.subtotalPaise, 15_090_000);
    assert.equal(quote.serviceFeePaise, 754_500);
    assert.equal(quote.cleaningFeePaise, 1_200_000);
    assert.equal(quote.totalPaise, 17_044_500);
  });

  it("is zero when nights are not positive", () => {
    const quote = quoteStay(1_000_000, 0);
    assert.equal(quote.totalPaise, 0);
  });
});
