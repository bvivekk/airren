import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { publicSitemapPaths, SITE_ORIGIN, siteUrl } from "./site.ts";

describe("siteUrl", () => {
  it("uses the apex origin without www or query strings", () => {
    assert.equal(siteUrl("/"), SITE_ORIGIN);
    assert.equal(siteUrl("/homes/sterling-canopy"), "https://airren.in/homes/sterling-canopy");
    assert.equal(SITE_ORIGIN, "https://airren.in");
  });

  it("rejects query strings that would fragment crawl", () => {
    assert.throws(() => siteUrl("/homes/sterling-canopy?checkIn=2026-10-01"), /query/);
  });
});

describe("publicSitemapPaths", () => {
  it("lists marketing pages, blog slugs, and clean home URLs", () => {
    const paths = publicSitemapPaths({
      homeSlugs: ["high-desert-mesa", "sterling-canopy"],
      blogSlugs: ["stowe-hiking", "ai-moment-in-travel"],
    });
    assert.deepEqual(paths, [
      "/",
      "/about",
      "/locations",
      "/list",
      "/os",
      "/help",
      "/blog",
      "/blog/ai-moment-in-travel",
      "/blog/stowe-hiking",
      "/homes/high-desert-mesa",
      "/homes/sterling-canopy",
    ]);
    assert.equal(
      paths.some((path) => path.includes("?") || path.includes("checkIn")),
      false,
    );
  });
});
