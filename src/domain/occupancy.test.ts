import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  calendarsFrom,
  isoDate,
  occupancyMessage,
  stay,
  stayNights,
  stayOf,
  type IsoDate,
  type Stay,
} from "./occupancy.ts";

function mustStay(from: string, to: string): Stay {
  const value = stay(from, to);
  assert.ok(value, `stay(${from}, ${to}) must construct`);
  return value;
}

function mustDay(value: string): IsoDate {
  const day = isoDate(value);
  assert.ok(day, `${value} must parse`);
  return day;
}

describe("isoDate", () => {
  it("accepts a real calendar day", () => {
    assert.equal(isoDate("2026-10-01"), "2026-10-01");
  });

  it("rejects malformed and impossible days", () => {
    assert.equal(isoDate("2026-10-1"), null);
    assert.equal(isoDate("2026-02-30"), null);
    assert.equal(isoDate("not a date"), null);
  });
});

describe("stay", () => {
  it("holds a half-open range", () => {
    const value = mustStay("2026-10-01", "2026-10-04");
    assert.equal(value.from, "2026-10-01");
    assert.equal(value.to, "2026-10-04");
    assert.equal(stayNights(value), 3);
  });

  it("cannot be built with checkout on or before check-in", () => {
    assert.equal(stay("2026-10-04", "2026-10-04"), null);
    assert.equal(stay("2026-10-04", "2026-10-01"), null);
  });

  it("stayOf spans month and year boundaries", () => {
    assert.equal(stayOf(mustDay("2026-12-30"), 3).to, "2027-01-02");
  });
});

describe("Calendar", () => {
  const window = mustStay("2026-10-01", "2026-11-01");
  const calendars = calendarsFrom(
    [
      { homeId: "home-a", stay: mustStay("2026-10-05", "2026-10-08") },
      { homeId: "home-a", stay: mustStay("2026-10-12", "2026-10-13") },
      { homeId: "home-b", stay: mustStay("2026-10-01", "2026-10-02") },
    ],
    window,
  );
  const calendar = calendars.for("home-a");

  it("names the first sold night in a straddling stay", () => {
    assert.equal(calendar.firstSoldNight(mustStay("2026-10-03", "2026-10-06")), "2026-10-05");
  });

  it("clears a fully open stay", () => {
    assert.equal(calendar.firstSoldNight(mustStay("2026-10-02", "2026-10-05")), null);
  });

  it("allows same-day turnover on both ends", () => {
    assert.equal(calendar.canStartOn(mustDay("2026-10-08")), true);
    assert.equal(calendar.canEndOn(mustDay("2026-10-03"), mustDay("2026-10-05")), true);
    assert.equal(calendar.firstSoldNight(mustStay("2026-10-08", "2026-10-10")), null);
  });

  it("refuses to start on a sold night", () => {
    assert.equal(calendar.canStartOn(mustDay("2026-10-06")), false);
  });

  it("refuses to end across a sold night", () => {
    assert.equal(calendar.canEndOn(mustDay("2026-10-03"), mustDay("2026-10-06")), false);
    assert.equal(calendar.canEndOn(mustDay("2026-10-03"), mustDay("2026-10-03")), false);
  });

  it("clamps latest checkout to the next sold night", () => {
    assert.equal(calendar.latestCheckOut(mustDay("2026-10-03")), "2026-10-05");
  });

  it("clamps latest checkout to the loaded window when nothing is sold ahead", () => {
    assert.equal(calendar.latestCheckOut(mustDay("2026-10-13")), "2026-11-01");
  });

  it("returns the start itself when the first night is sold", () => {
    assert.equal(calendar.latestCheckOut(mustDay("2026-10-05")), "2026-10-05");
  });

  it("gives an unknown home an all-open calendar", () => {
    const open = calendars.for("home-unknown");
    assert.equal(open.firstSoldNight(mustStay("2026-10-01", "2026-11-01")), null);
    assert.equal(open.latestCheckOut(mustDay("2026-10-01")), "2026-11-01");
  });

  it("ignores stays entirely outside the window", () => {
    const clipped = calendarsFrom(
      [{ homeId: "home-a", stay: mustStay("2026-09-01", "2026-09-05") }],
      window,
    ).for("home-a");
    assert.equal(clipped.firstSoldNight(mustStay("2026-10-01", "2026-11-01")), null);
  });

  it("serializes through dataFor and rebuilds the same answers", () => {
    const data = calendars.dataFor("home-a");
    const rebuilt = calendarsFrom(
      data.stays.map((value) => ({ homeId: "home-a", stay: value })),
      data.window,
    ).for("home-a");
    assert.equal(rebuilt.firstSoldNight(mustStay("2026-10-03", "2026-10-06")), "2026-10-05");
  });
});

describe("occupancyMessage", () => {
  it("speaks picker copy, not SQLSTATEs", () => {
    assert.equal(occupancyMessage("conflict"), "Those nights are already taken.");
    assert.equal(occupancyMessage("invalid-dates"), "Checkout must be after check-in.");
  });
});
