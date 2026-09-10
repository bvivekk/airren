import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { parseHome } from "./homes-repo.ts";

const row = {
  id: "aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee",
  slug: "sterling-canopy",
  name: "Sterling Canopy",
  type: "Home",
  city: "Stowe",
  region: "VT",
  country: "USA",
  beds: 3,
  baths: 3,
  guests: 6,
  nightly_rate_paise: 5_030_000,
  rating: "5.0",
  review_count: 48,
  savings_paise: 1_290_000,
  badges: ["luxury"],
  description: "A glass house.",
  home_photos: [
    { src: "/b.jpg", alt: "Bedroom", sort_order: 1 },
    { src: "/a.jpg", alt: "Forest", sort_order: 0 },
  ],
  home_amenities: [{ amenity: "Hot tub" }],
  home_categories: [{ category_id: "mountain" }, { category_id: "forest" }],
};

describe("parseHome", () => {
  it("maps a PostgREST home row onto Home", () => {
    const home = parseHome(row);
    assert.equal(home.id, row.id);
    assert.equal(home.slug, "sterling-canopy");
    assert.equal(home.location.city, "Stowe");
    assert.equal(home.nightlyRatePaise, 5_030_000);
    assert.equal(home.rating, 5);
    assert.deepEqual(home.badges, ["luxury"]);
    assert.deepEqual(home.categoryIds, ["mountain", "forest"]);
    assert.deepEqual(
      home.photos.map((photo) => photo.src),
      ["/a.jpg", "/b.jpg"],
    );
    assert.deepEqual(home.amenities, ["Hot tub"]);
  });

  it("rejects an unknown badge", () => {
    assert.throws(() => parseHome({ ...row, badges: ["vip"] }), /unknown home badge/);
  });

  it("rewrites storage photo src to a public object URL", () => {
    const previous = process.env.NEXT_PUBLIC_SUPABASE_URL;
    process.env.NEXT_PUBLIC_SUPABASE_URL = "http://127.0.0.1:54321";
    try {
      const home = parseHome({
        ...row,
        home_photos: [
          {
            src: "storage:listing-photos/user_1/listing-id/photo.jpg",
            alt: "Deck",
            sort_order: 0,
          },
        ],
      });
      assert.equal(
        home.photos[0].src,
        "http://127.0.0.1:54321/storage/v1/object/public/listing-photos/user_1/listing-id/photo.jpg",
      );
    } finally {
      process.env.NEXT_PUBLIC_SUPABASE_URL = previous;
    }
  });

  it("rewrites retired Unsplash photo ids", () => {
    const home = parseHome({
      ...row,
      home_photos: [
        {
          src: "https://images.unsplash.com/photo-1564013799907-f663824623d0?auto=format&fit=crop&w=1800&q=80",
          alt: "Oceanfront house with a long pool",
          sort_order: 0,
        },
      ],
    });
    assert.match(home.photos[0].src, /photo-1570129477492-45c003edd2be/);
  });
});
