import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { upcomingYearMonths, windowFromFlexible } from "./dates.ts";

describe("windowFromFlexible", () => {
  it("uses the first Friday of the first month for a weekend", () => {
    assert.deepEqual(windowFromFlexible("weekend", ["2026-09"]), {
      checkIn: "2026-09-04",
      checkOut: "2026-09-06",
    });
  });

  it("uses seven nights from the first for a week", () => {
    assert.deepEqual(windowFromFlexible("week", ["2026-11"]), {
      checkIn: "2026-11-01",
      checkOut: "2026-11-08",
    });
  });
});

describe("upcomingYearMonths", () => {
  it("returns twelve keys from September 2026", () => {
    const months = upcomingYearMonths("2026-09-09", 12);
    assert.equal(months[0], "2026-09");
    assert.equal(months[11], "2027-08");
    assert.equal(months.length, 12);
  });
});
