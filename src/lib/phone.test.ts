import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { guestCheckoutContact, toE164 } from "./phone.ts";

describe("toE164", () => {
  it("prefixes a 10-digit India number", () => {
    assert.equal(toE164("9876543210"), "+919876543210");
  });

  it("keeps an explicit country code", () => {
    assert.equal(toE164("+1 555 555 0100"), "+15555550100");
  });

  it("normalizes a 91-prefixed 12-digit number", () => {
    assert.equal(toE164("919876543210"), "+919876543210");
  });
});

describe("guestCheckoutContact", () => {
  it("omits contact when the guest has no phone", () => {
    assert.equal(guestCheckoutContact(undefined), undefined);
    assert.equal(guestCheckoutContact(""), undefined);
  });

  it("passes through a real number", () => {
    assert.equal(guestCheckoutContact("+919876543210"), "+919876543210");
  });
});
