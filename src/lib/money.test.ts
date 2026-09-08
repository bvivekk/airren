import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { formatInr, formatInrApprox, usdCentsToInrPaise } from "./money.ts";

describe("formatInr", () => {
  it("formats the documented USD-cent FX product as INR", () => {
    assert.equal(formatInr(60567 * 83), "₹50,271");
  });

  it("rounds converted catalog rates to the nearest hundred rupees", () => {
    assert.equal(usdCentsToInrPaise(60567), 5_030_000);
    assert.equal(formatInr(usdCentsToInrPaise(60567)), "₹50,300");
  });

  it("prefixes an approximate amount", () => {
    assert.equal(formatInrApprox(1_200_000), "~₹12,000");
  });
});
