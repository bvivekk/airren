import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { serverStayCharge } from "./amount.ts";

describe("serverStayCharge", () => {
  it("prices the stay from the nightly rate and dates", () => {
    const charge = serverStayCharge({
      nightlyRatePaise: 250_000,
      checkIn: "2026-11-01",
      checkOut: "2026-11-04",
    });
    assert.deepEqual(charge, {
      nights: 3,
      subtotalPaise: 750_000,
      totalPaise: 750_000,
    });
  });

  it("rejects a stay whose dates do not cover a night", () => {
    assert.equal(
      serverStayCharge({
        nightlyRatePaise: 250_000,
        checkIn: "2026-11-04",
        checkOut: "2026-11-04",
      }),
      null,
    );
  });

  it("rejects a non-integer nightly rate", () => {
    assert.equal(
      serverStayCharge({
        nightlyRatePaise: 10.5,
        checkIn: "2026-11-01",
        checkOut: "2026-11-02",
      }),
      null,
    );
  });
});
