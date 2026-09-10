import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { parseMappingModel, parseMappingStatus } from "./channels.ts";

describe("parseMappingStatus", () => {
  it("keeps ready and needs_mapping as tokens", () => {
    assert.deepEqual(parseMappingStatus({ kind: "ready" }), { kind: "ready" });
    assert.deepEqual(parseMappingStatus({ kind: "needs_mapping" }), { kind: "needs_mapping" });
  });

  it("parses a conflict with a half-open stay", () => {
    const status = parseMappingStatus({
      kind: "conflict",
      reservationId: "res_1",
      stay: { from: "2026-11-01", to: "2026-11-04" },
      resolvedAt: null,
    });
    assert.equal(status.kind, "conflict");
    if (status.kind === "conflict") {
      assert.equal(status.reservationId, "res_1");
      assert.equal(status.stay.from, "2026-11-01");
      assert.equal(status.stay.to, "2026-11-04");
    }
  });
});

describe("parseMappingModel", () => {
  it("maps a host mapping payload", () => {
    const model = parseMappingModel({
      connectionId: "44444444-4444-4444-8444-444444444444",
      access: "read_only",
      listings: [
        {
          platform: "airbnb",
          listingId: "lst_1",
          displayName: "Cabin",
          mappedHomeId: null,
          status: { kind: "needs_mapping" },
        },
      ],
      issues: [{ kind: "needs_mapping" }],
    });
    assert.equal(model.listings.length, 1);
    assert.equal(model.listings[0]?.status.kind, "needs_mapping");
    assert.equal(model.issues[0]?.kind, "needs_mapping");
  });
});
