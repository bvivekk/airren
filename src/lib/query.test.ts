import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { emptySearchMessage, parseStayQuery, stayQuerySearchParams, stayWhenLabel, stayWhoLabel } from "./query.ts";

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

  it("resolves a flexible weekend from the selected months", () => {
    const query = parseStayQuery({
      whenMode: "flexible",
      stay: "weekend",
      months: "2026-11,2026-12",
    });
    assert.equal(query.when.kind, "flexible");
    if (query.when.kind !== "flexible") {
      throw new Error("expected flexible stay");
    }
    assert.equal(query.when.stay, "weekend");
    assert.deepEqual(query.when.months, ["2026-11", "2026-12"]);
    assert.equal(query.checkIn, "2026-11-06");
    assert.equal(query.checkOut, "2026-11-08");
  });

  it("resolves a flexible week from the first of a future month", () => {
    const query = parseStayQuery({
      stay: "week",
      months: "2026-10",
    });
    assert.equal(query.checkIn, "2026-10-01");
    assert.equal(query.checkOut, "2026-10-08");
  });

  it("ignores stale past dates on a flexible search", () => {
    const query = parseStayQuery({
      whenMode: "flexible",
      stay: "weekend",
      months: "2026-11",
      checkIn: "2026-09-04",
      checkOut: "2026-09-06",
    });
    assert.equal(query.checkIn, "2026-11-06");
    assert.equal(query.checkOut, "2026-11-08");
  });

  it("repairs a missing checkout so the stay is after check-in", () => {
    const query = parseStayQuery({ checkIn: "2026-12-01" });
    assert.equal(query.checkIn, "2026-12-01");
    assert.equal(query.checkOut, "2026-12-04");
  });

  it("repairs a checkout that falls on or before check-in", () => {
    const query = parseStayQuery({ checkIn: "2026-12-01", checkOut: "2026-11-20" });
    assert.equal(query.checkOut, "2026-12-02");
  });
});

describe("stayQuerySearchParams", () => {
  it("keeps pets, flex, and when mode on listing URLs", () => {
    const query = parseStayQuery({
      where: "Florida",
      checkIn: "2026-10-01",
      checkOut: "2026-10-04",
      who: "3",
      pets: "1",
      flex: "2",
    });
    const params = stayQuerySearchParams(query);
    assert.equal(params.get("where"), "Florida");
    assert.equal(params.get("pets"), "1");
    assert.equal(params.get("flex"), "2");
    assert.equal(params.get("whenMode"), "dates");
    assert.equal(params.get("who"), "3");
  });

  it("keeps flexible months on listing URLs", () => {
    const query = parseStayQuery({
      whenMode: "flexible",
      stay: "week",
      months: "2026-11,2026-12",
    });
    const params = stayQuerySearchParams(query);
    assert.equal(params.get("whenMode"), "flexible");
    assert.equal(params.get("stay"), "week");
    assert.equal(params.get("months"), "2026-11,2026-12");
  });
});

describe("stay labels", () => {
  it("names any guests and pets from the parsed query", () => {
    const query = parseStayQuery({ who: "0", pets: "1" });
    assert.equal(stayWhoLabel(query), "Any guests · 1 pet");
  });

  it("names a flexible weekend month", () => {
    const query = parseStayQuery({ stay: "weekend", months: "2026-11" });
    assert.equal(stayWhenLabel(query), "Weekend · 2026-11");
  });
});

describe("emptySearchMessage", () => {
  it("keeps the dates and guests copy when those are the active filters", () => {
    const query = parseStayQuery({ checkIn: "2026-10-01", checkOut: "2026-10-04", who: "2" });
    assert.equal(
      emptySearchMessage(query),
      "No homes match those dates and guests. Try fewer people or another place.",
    );
  });

  it("mentions pets when they emptied the results", () => {
    const query = parseStayQuery({
      checkIn: "2026-10-01",
      checkOut: "2026-10-04",
      who: "2",
      pets: "1",
    });
    assert.equal(
      emptySearchMessage(query),
      "No homes match those dates, guests, and pets. Try fewer people, skipping pets, or another place.",
    );
  });
});
