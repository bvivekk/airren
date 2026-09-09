import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { addDaysIso, defaultStayWindow, nightsBetween, upcomingYearMonths, windowFromFlexible } from "./dates.ts";

describe("nightsBetween", () => {
  it("counts whole nights", () => {
    assert.equal(nightsBetween("2026-10-01", "2026-10-04"), 3);
  });
});

describe("defaultStayWindow", () => {
  it("is three nights", () => {
    const stay = defaultStayWindow();
    assert.equal(nightsBetween(stay.checkIn, stay.checkOut), 3);
    assert.equal(stay.checkOut, addDaysIso(stay.checkIn, 3));
  });
});

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
