import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { parseStayQuery, stayWhenLabel, stayWhoLabel } from "./query.ts";

describe("parseStayQuery", () => {
  it("keeps missing who as two guests", () => {
    const query = parseStayQuery({});
    assert.equal(query.guests, 2);
    assert.equal(query.pets, 0);
    assert.deepEqual(query.when, { kind: "dates", flexibility: 0 });
  });

  it("treats who=0 as any guests", () => {
    const query = parseStayQuery({ who: "0" });
    assert.equal(query.guests, 0);
  });

  it("reads pets and date flexibility from the existing search params", () => {
    const query = parseStayQuery({
      where: "California",
      checkIn: "2026-10-01",
      checkOut: "2026-10-04",
      who: "4",
      pets: "2",
      flex: "3",
    });
    assert.equal(query.where, "California");
    assert.equal(query.checkIn, "2026-10-01");
    assert.equal(query.checkOut, "2026-10-04");
    assert.equal(query.guests, 4);
    assert.equal(query.pets, 2);
    assert.deepEqual(query.when, { kind: "dates", flexibility: 3 });
  });

  it("resolves a flexible weekend from the first selected month", () => {
    const query = parseStayQuery({
      whenMode: "flexible",
      stay: "weekend",
      months: "2026-09,2026-10",
    });
    assert.equal(query.when.kind, "flexible");
    if (query.when.kind !== "flexible") {
      throw new Error("expected flexible stay");
    }
    assert.equal(query.when.stay, "weekend");
    assert.deepEqual(query.when.months, ["2026-09", "2026-10"]);
    assert.equal(query.checkIn, "2026-09-04");
    assert.equal(query.checkOut, "2026-09-06");
  });

  it("resolves a flexible week from the first of the month", () => {
    const query = parseStayQuery({
      stay: "week",
      months: "2026-10",
    });
    assert.equal(query.checkIn, "2026-10-01");
    assert.equal(query.checkOut, "2026-10-08");
  });
});

describe("stay labels", () => {
  it("names any guests and pets from the parsed query", () => {
    const query = parseStayQuery({ who: "0", pets: "1" });
    assert.equal(stayWhoLabel(query), "Any guests · 1 pet");
  });

  it("names a flexible weekend month", () => {
    const query = parseStayQuery({ stay: "weekend", months: "2026-09" });
    assert.equal(stayWhenLabel(query), "Weekend · 2026-09");
  });
});
