import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  addDaysIso,
  defaultStayWindow,
  nightsBetween,
  repairCheckOut,
  upcomingYearMonths,
  windowFromFlexible,
} from "./dates.ts";

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

describe("repairCheckOut", () => {
  it("keeps a checkout after check-in", () => {
    assert.equal(repairCheckOut("2026-12-01", "2026-12-05"), "2026-12-05");
  });

  it("uses three nights when checkout is missing", () => {
    assert.equal(repairCheckOut("2026-12-01", ""), "2026-12-04");
  });

  it("advances one night when checkout is not after check-in", () => {
    assert.equal(repairCheckOut("2026-12-01", "2026-11-20"), "2026-12-02");
    assert.equal(repairCheckOut("2026-12-01", "2026-12-01"), "2026-12-02");
  });
});

describe("windowFromFlexible", () => {
  it("uses the first Friday of the first month for a weekend still in the future", () => {
    assert.deepEqual(windowFromFlexible("weekend", ["2026-09"], "2026-09-01"), {
      checkIn: "2026-09-04",
      checkOut: "2026-09-06",
    });
  });

  it("skips a weekend that has already started", () => {
    assert.deepEqual(windowFromFlexible("weekend", ["2026-09"], "2026-09-09"), {
      checkIn: "2026-09-11",
      checkOut: "2026-09-13",
    });
  });

  it("uses seven nights from the first for a week still in the future", () => {
    assert.deepEqual(windowFromFlexible("week", ["2026-11"], "2026-09-09"), {
      checkIn: "2026-11-01",
      checkOut: "2026-11-08",
    });
  });

  it("advances a week stay past the first of this month", () => {
    assert.deepEqual(windowFromFlexible("week", ["2026-09"], "2026-09-09"), {
      checkIn: "2026-09-15",
      checkOut: "2026-09-22",
    });
  });

  it("uses the next selected month when this month has no future weekend", () => {
    assert.deepEqual(windowFromFlexible("weekend", ["2026-09", "2026-10"], "2026-09-26"), {
      checkIn: "2026-10-02",
      checkOut: "2026-10-04",
    });
  });

  it("does not resolve a past check-in when every selected month is over", () => {
    const window = windowFromFlexible("weekend", ["2026-08"], "2026-09-09");
    assert.ok(window.checkIn >= "2026-09-09");
    assert.equal(nightsBetween(window.checkIn, window.checkOut), 3);
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
