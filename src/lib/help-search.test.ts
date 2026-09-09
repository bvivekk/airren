import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { HelpArticle } from "../data/help.ts";
import { filterHelpArticles } from "./help-search.ts";

const articles: HelpArticle[] = [
  {
    slug: "wifi",
    collection: "home-manual",
    title: "Wi-Fi and the house tablet",
    body: "Password on the tablet.",
  },
  {
    slug: "refunds",
    collection: "payments",
    title: "Refunds on a demo hold",
    body: "No card is charged.",
  },
];

describe("filterHelpArticles", () => {
  it("returns all when the query is empty", () => {
    assert.equal(filterHelpArticles(articles, "  ").length, 2);
  });

  it("matches a title", () => {
    const result = filterHelpArticles(articles, "wifi");
    assert.equal(result.length, 1);
    assert.equal(result[0]?.slug, "wifi");
  });
});
