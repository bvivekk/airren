import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  InvalidApexError,
  canonicalUrl,
  originUrl,
  parsePublicSite,
  publicSite,
  wwwHost,
} from "./public-site.ts";

describe("parsePublicSite", () => {
  it("accepts a normalized bare apex", () => {
    const site = parsePublicSite("AIRREN.IN");
    assert.equal(site.apex, "airren.in");
    assert.equal(site.origin, "https://airren.in");
    assert.equal(site.hello, "hello@airren.in");
  });

  it("rejects values that are not a bare apex", () => {
    const rejected = [
      undefined,
      "",
      "   ",
      12,
      "https://airren.in",
      "www.airren.in",
      "airren.in/",
      "airren.in:443",
      "localhost",
      "127.0.0.1",
      "airren.vercel.app",
      "preview.vercel.app",
    ];
    for (const input of rejected) {
      assert.throws(() => parsePublicSite(input), InvalidApexError);
    }
  });
});

describe("publicSite", () => {
  it("reads NEXT_PUBLIC_AIRREN_APEX at the env boundary", () => {
    const site = publicSite({ NEXT_PUBLIC_AIRREN_APEX: "airren.in" });
    assert.equal(site.apex, "airren.in");
  });

  it("fails when the env value is missing", () => {
    assert.throws(() => publicSite({}), InvalidApexError);
  });
});

describe("deriveProductionSite", () => {
  it("derives canonical, www, and contact identities from one apex", () => {
    const site = parsePublicSite("airren.in");
    assert.equal(originUrl(site).href, "https://airren.in/");
    assert.equal(wwwHost(site), "www.airren.in");
    assert.equal(canonicalUrl(site, "/homes/x?pets=1"), "https://airren.in/homes/x?pets=1");
    assert.equal(canonicalUrl(site, "https://evil.example/homes/x"), "https://airren.in/homes/x");
    assert.equal(canonicalUrl(site, "/"), "https://airren.in/");
  });
});
