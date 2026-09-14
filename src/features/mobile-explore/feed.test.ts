import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { Home, StayQuery } from "../../domain/home.ts";
import { buildMobileExploreFeed } from "./feed.ts";

const query: StayQuery = {
  where: "",
  checkIn: "2026-10-01",
  checkOut: "2026-10-04",
  guests: 2,
  pets: 0,
  when: { kind: "dates", flexibility: 0 },
};

const href =
  "where=&checkIn=2026-10-01&checkOut=2026-10-04&who=2&pets=0&whenMode=dates&flex=0";

function home(overrides: Partial<Home> & Pick<Home, "slug" | "name" | "location">): Home {
  return {
    id: overrides.id ?? overrides.slug,
    type: "Home",
    beds: 2,
    baths: 1,
    guests: 4,
    nightlyRatePaise: 5_000_000,
    rating: 4.5,
    reviewCount: 4,
    savingsPaise: 0,
    badges: [],
    categoryIds: ["beach"],
    photos: [{ src: "/photo.jpg", alt: "Deck" }],
    amenities: [],
    description: "",
    ...overrides,
  };
}

const aspenLake = home({
  slug: "aspen-lake",
  name: "Aspen Lake House",
  location: { city: "Aspen", region: "CO", country: "USA" },
  beds: 1,
  rating: 4.9,
  reviewCount: 12,
  categoryIds: ["lake"],
});

const aspenCabin = home({
  slug: "aspen-cabin",
  name: "Aspen Cabin",
  location: { city: "Aspen", region: "CO", country: "USA" },
  badges: ["luxury"],
  categoryIds: ["mountain"],
});

const boiseLoft = home({
  slug: "boise-loft",
  name: "Boise Loft",
  location: { city: "Boise", region: "ID", country: "USA" },
  rating: 4.5,
  reviewCount: 5,
  badges: ["iconic"],
  categoryIds: ["city"],
  photos: [],
});

const boiseStudio = home({
  slug: "boise-studio",
  name: "Boise Studio",
  location: { city: "Boise", region: "ID", country: "USA" },
  beds: 1,
  reviewCount: 0,
  rating: 0,
  categoryIds: ["city"],
});

const zionTent = home({
  slug: "zion-tent",
  name: "Zion Tent",
  location: { city: "Zion", region: "UT", country: "USA" },
  categoryIds: ["desert"],
});

const catalog = [aspenLake, aspenCabin, boiseLoft, boiseStudio, zionTent];

describe("buildMobileExploreFeed", () => {
  it("omits recently viewed when no slugs resolve", () => {
    const feed = buildMobileExploreFeed(catalog, query, new Set(), [], "all");
    assert.equal(
      feed.some((section) => section.kind === "recently-viewed"),
      false,
    );
    assert.deepEqual(
      feed.map((section) => section.title),
      ["Popular homes in Aspen", "Popular homes in Boise", "Popular homes in Zion"],
    );
  });

  it("treats an unknown category as all", () => {
    const unknown = buildMobileExploreFeed(catalog, query, new Set(), [], "not-a-category");
    const all = buildMobileExploreFeed(catalog, query, new Set(), [], "all");
    assert.deepEqual(unknown, all);
  });

  it("filters city rails by a known category and keeps a recent home outside that category", () => {
    const feed = buildMobileExploreFeed(catalog, query, new Set(["aspen-cabin"]), ["aspen-cabin"], "lake");
    assert.deepEqual(feed, [
      {
        kind: "recently-viewed",
        title: "Recently viewed",
        cards: [
          {
            slug: "aspen-cabin",
            href: `/homes/aspen-cabin?${href}`,
            photo: { src: "/photo.jpg", alt: "Deck" },
            title: "Aspen Cabin",
            meta: "2 beds · ★ 4.5",
            saved: true,
          },
        ],
      },
      {
        kind: "city",
        city: "Aspen",
        title: "Popular homes in Aspen",
        cards: [
          {
            slug: "aspen-lake",
            href: `/homes/aspen-lake?${href}`,
            photo: { src: "/photo.jpg", alt: "Deck" },
            title: "Aspen Lake House",
            priceLine: "₹1,50,000 for 3 nights",
            ratingLabel: "★ 4.9",
            badge: "Guest favourite",
            saved: false,
          },
        ],
      },
    ]);
  });

  it("groups cities by count descending then name", () => {
    const feed = buildMobileExploreFeed(catalog, query, new Set(), [], "all");
    assert.deepEqual(
      feed.map((section) => {
        if (section.kind !== "city") {
          throw new Error("expected city section");
        }
        return { city: section.city, count: section.cards.length, title: section.title };
      }),
      [
        { city: "Aspen", count: 2, title: "Popular homes in Aspen" },
        { city: "Boise", count: 2, title: "Popular homes in Boise" },
        { city: "Zion", count: 1, title: "Popular homes in Zion" },
      ],
    );
  });

  it("uses guest favourite before a catalog badge", () => {
    const feed = buildMobileExploreFeed([aspenLake, aspenCabin], query, new Set(), [], "all");
    const city = feed[0];
    assert.equal(city?.kind, "city");
    if (city?.kind !== "city") {
      throw new Error("expected city section");
    }
    assert.equal(city.cards[0]?.badge, "Guest favourite");
    assert.equal(city.cards[1]?.badge, "Luxury");
  });

  it("shows a notice when a known category matches nothing", () => {
    const feed = buildMobileExploreFeed(catalog, query, new Set(), ["aspen-lake"], "ski");
    assert.deepEqual(
      feed.map((section) => section.kind),
      ["recently-viewed", "notice"],
    );
    assert.deepEqual(feed[1], {
      kind: "notice",
      title: "No Ski Season homes",
      detail: "Nothing in the catalog matches this category right now.",
    });
  });

  it("does not invent cards from an empty wishlist", () => {
    const feed = buildMobileExploreFeed(catalog, query, new Set(), [], "all");
    const slugs = feed.flatMap((section) =>
      section.kind === "notice" ? [] : section.cards.map((card) => card.slug),
    );
    assert.deepEqual(slugs, [
      "aspen-lake",
      "aspen-cabin",
      "boise-loft",
      "boise-studio",
      "zion-tent",
    ]);
    assert.equal(
      feed.every((section) => section.cards.every((card) => card.saved === false)),
      true,
    );
  });

  it("quotes the passed stay and marks a 1-bed peek as New when there are no reviews", () => {
    const oneNight: StayQuery = { ...query, checkOut: "2026-10-02" };
    const feed = buildMobileExploreFeed(
      [boiseStudio],
      oneNight,
      new Set(),
      ["boise-studio"],
      "all",
    );
    assert.deepEqual(feed, [
      {
        kind: "recently-viewed",
        title: "Recently viewed",
        cards: [
          {
            slug: "boise-studio",
            href: `/homes/boise-studio?${stayQuerySearchParamsFor(oneNight)}`,
            photo: { src: "/photo.jpg", alt: "Deck" },
            title: "Boise Studio",
            meta: "1 bed · New",
            saved: false,
          },
        ],
      },
      {
        kind: "city",
        city: "Boise",
        title: "Popular homes in Boise",
        cards: [
          {
            slug: "boise-studio",
            href: `/homes/boise-studio?${stayQuerySearchParamsFor(oneNight)}`,
            photo: { src: "/photo.jpg", alt: "Deck" },
            title: "Boise Studio",
            priceLine: "₹50,000 for 1 night",
            ratingLabel: "New",
            badge: null,
            saved: false,
          },
        ],
      },
    ]);
  });
});

function stayQuerySearchParamsFor(stay: StayQuery): string {
  return `where=&checkIn=${stay.checkIn}&checkOut=${stay.checkOut}&who=2&pets=0&whenMode=dates&flex=0`;
}
