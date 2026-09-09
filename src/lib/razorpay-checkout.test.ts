import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { razorpayUpiAppDisplay } from "./razorpay-checkout.ts";

describe("razorpay UPI app checkout", () => {
  it("puts Google Pay and PhonePe first as intent apps", () => {
    const config = razorpayUpiAppDisplay();
    assert.deepEqual(config.display.sequence.slice(0, 2), ["block.gpay", "block.phonepe"]);
    assert.deepEqual(config.display.blocks.gpay.instruments[0], {
      method: "upi",
      flows: ["intent"],
      apps: ["google_pay"],
    });
    assert.deepEqual(config.display.blocks.phonepe.instruments[0], {
      method: "upi",
      flows: ["intent"],
      apps: ["phonepe"],
    });
    assert.equal(config.display.preferences.show_default_blocks, true);
  });
});
