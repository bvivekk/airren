import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { Home } from "../domain/home.ts";
import { filterHomes } from "./search.ts";

const sample: Home[] = [
  {
    slug: "stowe",
    name: "Sterling Canopy",
    type: "Home",
    location: { city: "Stowe", region: "VT", country: "USA" },
    beds: 3,
    baths: 3,
    guests: 6,
    nightlyRatePaise: 5_000_000,
    rating: 5,
    reviewCount: 1,
    savingsPaise: 830_000,
    badges: ["luxury"],
    categoryIds: ["mountain"],
    photos: [{ src: "/x.jpg", alt: "x" }],
    amenities: [],
    description: "",
  },
  {
    slug: "tiny",
    name: "Tiny Cabin",
    type: "Home",
    location: { city: "Moab", region: "UT", country: "USA" },
    beds: 1,
    baths: 1,
    guests: 2,
    nightlyRatePaise: 1_660_000,
    rating: 5,
    reviewCount: 1,
    savingsPaise: 80_000,
    badges: [],
    categoryIds: ["desert"],
    photos: [{ src: "/x.jpg", alt: "x" }],
    amenities: [],
    description: "",
  },
];

describe("filterHomes", () => {
  it("matches city", () => {
    const result = filterHomes(sample, {
      where: "stowe",
      checkIn: "2026-10-01",
      checkOut: "2026-10-04",
      guests: 2,
    });
    assert.equal(result.length, 1);
    assert.equal(result[0]?.slug, "stowe");
  });

  it("drops homes under the guest cap", () => {
    const result = filterHomes(sample, {
      where: "",
      checkIn: "2026-10-01",
      checkOut: "2026-10-04",
      guests: 12,
    });
    assert.equal(result.length, 0);
  });

  it("returns none when where misses", () => {
    const result = filterHomes(sample, {
      where: "paris",
      checkIn: "2026-10-01",
      checkOut: "2026-10-04",
      guests: 2,
    });
    assert.equal(result.length, 0);
  });
});
