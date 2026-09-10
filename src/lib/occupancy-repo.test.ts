import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { stayNights } from "../domain/occupancy.ts";
import { bookingWindow, occupancyFailure, parseListingCalendar } from "./occupancy-repo.ts";

const payload = {
  listingId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
  from: "2026-10-01",
  to: "2027-11-05",
  entries: [
    {
      id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
      checkIn: "2026-10-05",
      checkOut: "2026-10-08",
      source: "airren",
      label: null,
      removable: false,
    },
    {
      id: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
      checkIn: "2026-10-12",
      checkOut: "2026-10-14",
      source: "host",
      label: "Booked on Airbnb",
      removable: true,
    },
  ],
};

describe("parseListingCalendar", () => {
  it("maps a listing_calendar payload onto CalendarEntry", () => {
    const entries = parseListingCalendar(payload);
    assert.equal(entries.length, 2);
    assert.equal(entries[0]?.stay.from, "2026-10-05");
    assert.equal(entries[0]?.source, "airren");
    assert.equal(entries[0]?.removable, false);
    assert.equal(entries[1]?.label, "Booked on Airbnb");
    assert.equal(entries[1]?.removable, true);
  });

  it("rejects an unknown source", () => {
    const forged = {
      ...payload,
      entries: [{ ...payload.entries[0], source: "ical" }],
    };
    assert.throws(() => parseListingCalendar(forged), /unknown occupancy source/);
  });

  it("rejects an inverted night range", () => {
    const inverted = {
      ...payload,
      entries: [{ ...payload.entries[0], checkIn: "2026-10-08", checkOut: "2026-10-05" }],
    };
    assert.throws(() => parseListingCalendar(inverted), /valid night range/);
  });
});

describe("occupancyFailure", () => {
  it("maps SQLSTATEs and RPC messages to domain failures", () => {
    assert.equal(occupancyFailure({ code: "23P01", message: "conflicting key value" }), "conflict");
    assert.equal(occupancyFailure({ code: "42501", message: "that stay was booked on Airren" }), "airren-stay");
    assert.equal(occupancyFailure({ code: "P0001", message: "listing not found" }), "not-yours");
    assert.equal(occupancyFailure({ code: "P0001", message: "check-out must be after check-in" }), "invalid-dates");
  });

  it("leaves unexpected errors unmapped", () => {
    assert.equal(occupancyFailure({ code: "P0001", message: "signed in host required" }), null);
  });
});

describe("bookingWindow", () => {
  it("spans the 400 nights the SQL calendar horizon uses", () => {
    assert.equal(stayNights(bookingWindow()), 400);
  });
});
