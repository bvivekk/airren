import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { safeAppPath } from "./auth-redirect.ts";

describe("safeAppPath", () => {
  it("keeps a listing path with search params", () => {
    assert.equal(
      safeAppPath("/homes/siesta-key-house?where=Florida&pets=1"),
      "/homes/siesta-key-house?where=Florida&pets=1",
    );
  });

  it("rejects protocol-relative and off-site values", () => {
    assert.equal(safeAppPath("//evil.example/phish"), "/");
    assert.equal(safeAppPath("https://evil.example/homes/x"), "/homes/x");
    assert.equal(safeAppPath("/sso-callback?redirect_url=/homes/x"), "/");
  });
});
