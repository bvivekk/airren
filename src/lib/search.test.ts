import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { Home } from "../domain/home.ts";
import { filterHomes } from "./search.ts";

const sample: Home[] = [
  {
    id: "home-stowe",
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
    categoryIds: ["mountain", "pet-friendly"],
    photos: [{ src: "/x.jpg", alt: "x" }],
    amenities: [],
    description: "",
  },
  {
    id: "home-tiny",
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
      pets: 0,
      when: { kind: "dates", flexibility: 0 },
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
      pets: 0,
      when: { kind: "dates", flexibility: 0 },
    });
    assert.equal(result.length, 0);
  });

  it("matches a US state name against the region code", () => {
    const result = filterHomes(
      [
        {
          ...sample[0]!,
          location: { city: "La Jolla", region: "CA", country: "USA" },
        },
      ],
      {
        where: "California",
        checkIn: "2026-10-01",
        checkOut: "2026-10-04",
        guests: 2,
        pets: 0,
        when: { kind: "dates", flexibility: 0 },
      },
    );
    assert.equal(result.length, 1);
  });

  it("skips the guest cap when guests are any", () => {
    const result = filterHomes(sample, {
      where: "",
      checkIn: "2026-10-01",
      checkOut: "2026-10-04",
      guests: 0,
      pets: 0,
      when: { kind: "dates", flexibility: 0 },
    });
    assert.equal(result.length, 2);
  });

  it("returns none when where misses", () => {
    const result = filterHomes(sample, {
      where: "paris",
      checkIn: "2026-10-01",
      checkOut: "2026-10-04",
      guests: 2,
      pets: 0,
      when: { kind: "dates", flexibility: 0 },
    });
    assert.equal(result.length, 0);
  });

  it("keeps only pet-friendly homes when pets are requested", () => {
    const result = filterHomes(sample, {
      where: "",
      checkIn: "2026-10-01",
      checkOut: "2026-10-04",
      guests: 2,
      pets: 1,
      when: { kind: "dates", flexibility: 0 },
    });
    assert.equal(result.length, 1);
    assert.equal(result[0]?.slug, "stowe");
  });

  it("hides a home whose exact dates are booked", () => {
    const result = filterHomes(
      sample,
      {
        where: "",
        checkIn: "2026-10-01",
        checkOut: "2026-10-04",
        guests: 2,
        pets: 0,
        when: { kind: "dates", flexibility: 0 },
      },
      [{ homeId: "home-stowe", checkIn: "2026-10-01", checkOut: "2026-10-04" }],
    );
    assert.equal(result.map((home) => home.slug).join(","), "tiny");
  });

  it("keeps a booked home when date flexibility opens a free window", () => {
    const result = filterHomes(
      sample,
      {
        where: "stowe",
        checkIn: "2026-10-01",
        checkOut: "2026-10-04",
        guests: 2,
        pets: 0,
        when: { kind: "dates", flexibility: 1 },
      },
      [{ homeId: "home-stowe", checkIn: "2026-10-01", checkOut: "2026-10-02" }],
    );
    assert.equal(result.length, 1);
  });
});
