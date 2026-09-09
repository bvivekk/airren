import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { razorpayCheckoutMethods, razorpayUpiAppDisplay } from "./razorpay-checkout.ts";

describe("razorpay UPI app checkout", () => {
  it("enables UPI alongside cards, netbanking, and wallets", () => {
    assert.deepEqual(razorpayCheckoutMethods(), {
      upi: true,
      card: true,
      netbanking: true,
      wallet: true,
    });
  });

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

  it("keeps UPI QR and intent visible so desktop checkout is not intent-only", () => {
    const config = razorpayUpiAppDisplay();
    assert.deepEqual(config.display.blocks.upi_qr.instruments[0], {
      method: "upi",
      flows: ["qr", "intent"],
    });
    assert.equal(config.display.sequence.includes("block.upi_qr"), true);
    assert.equal(config.display.sequence.includes("upi"), true);
  });
});
