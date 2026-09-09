import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { quoteStay } from "./pricing.ts";

describe("quoteStay", () => {
  it("prices three nights plus fees", () => {
    const quote = quoteStay(60567, 3);
    assert.equal(quote.nights, 3);
    assert.equal(quote.subtotalCents, 181701);
    assert.equal(quote.serviceFeeCents, 9085);
    assert.equal(quote.cleaningFeeCents, 12000);
    assert.equal(quote.totalCents, 202786);
  });

  it("is zero when nights are not positive", () => {
    const quote = quoteStay(10000, 0);
    assert.equal(quote.totalCents, 0);
  });
});
