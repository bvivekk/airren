import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { SupabaseClient } from "@supabase/supabase-js";
import { parseHome } from "./homes-repo.ts";
import {
  listMyListings,
  parseSnapshot,
  publishListing,
  saveListingDraft,
} from "./host-listings-repo.ts";

function withSupabaseUrl<T>(run: () => T): T {
  const previous = process.env.NEXT_PUBLIC_SUPABASE_URL;
  process.env.NEXT_PUBLIC_SUPABASE_URL = "http://127.0.0.1:54321";
  try {
    return run();
  } finally {
    process.env.NEXT_PUBLIC_SUPABASE_URL = previous;
  }
}

const completeContent = {
  name: "Cedar Ridge Cabin",
  type: "Cabin",
  location: { city: "Stowe", region: "VT", country: "USA" },
  beds: 3,
  baths: 2,
  guests: 6,
  nightlyRatePaise: 4_500_000,
  description: "A ridge cabin with a wood stove, a long porch, and room for a weekend with friends.",
  amenities: ["Hot tub"],
  photos: [
    {
      id: "11111111-2222-4333-8444-555555555555",
      src: "storage:listing-photos/host_a/live/photo.jpg",
      alt: "Deck at dusk",
    },
  ],
};

const draftSnapshot = {
  listing: {
    id: "aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee",
    slug: "draft-aaaaaaaa",
    status: "draft",
    publishedAt: null,
    updatedAt: "2026-09-10T12:00:00.000Z",
    content: {
      name: null,
      type: null,
      location: { city: null, region: null, country: null },
      beds: 0,
      baths: 0,
      guests: null,
      nightlyRatePaise: null,
      description: null,
      amenities: [],
      photos: [],
    },
  },
  readiness: {
    ready: false,
    issues: [{ field: "name", message: "Give your home a name (3-80 characters)." }],
  },
};

const publishedSnapshot = {
  listing: {
    id: "bbbbbbbb-cccc-4ddd-8eee-ffffffffffff",
    slug: "cedar-ridge-cabin",
    status: "published",
    publishedAt: "2026-09-10T13:00:00.000Z",
    updatedAt: "2026-09-10T13:00:00.000Z",
    content: completeContent,
  },
  readiness: {
    ready: true,
    content: completeContent,
  },
};

describe("parseSnapshot", () => {
  it("keeps draft fields optional and readiness as SQL issues", () => {
    const snapshot = parseSnapshot(draftSnapshot);
    assert.equal(snapshot.listing.status, "draft");
    if (snapshot.listing.status !== "draft") {
      throw new Error("expected draft");
    }
    assert.equal(snapshot.listing.content.name, null);
    assert.equal(snapshot.readiness.ready, false);
    if (snapshot.readiness.ready) {
      throw new Error("expected issues");
    }
    assert.deepEqual(snapshot.readiness.issues, [
      { field: "name", message: "Give your home a name (3-80 characters)." },
    ]);
  });

  it("narrows a published listing and resolves storage photo src", () => {
    const snapshot = withSupabaseUrl(() => parseSnapshot(publishedSnapshot));
    assert.equal(snapshot.listing.status, "published");
    if (snapshot.listing.status === "draft") {
      throw new Error("expected published");
    }
    assert.equal(snapshot.listing.content.name, "Cedar Ridge Cabin");
    assert.equal(
      snapshot.listing.content.photos[0].src,
      "http://127.0.0.1:54321/storage/v1/object/public/listing-photos/host_a/live/photo.jpg",
    );
    assert.equal(snapshot.readiness.ready, true);
  });
});

describe("published host row", () => {
  it("satisfies parseHome", () => {
    const home = withSupabaseUrl(() => parseHome({
      id: publishedSnapshot.listing.id,
      slug: publishedSnapshot.listing.slug,
      name: completeContent.name,
      type: completeContent.type,
      city: completeContent.location.city,
      region: completeContent.location.region,
      country: completeContent.location.country,
      beds: completeContent.beds,
      baths: completeContent.baths,
      guests: completeContent.guests,
      nightly_rate_paise: completeContent.nightlyRatePaise,
      rating: 0,
      review_count: 0,
      savings_paise: 0,
      badges: [],
      description: completeContent.description,
      home_photos: [
        {
          src: completeContent.photos[0].src,
          alt: completeContent.photos[0].alt,
          sort_order: 0,
        },
      ],
      home_amenities: [{ amenity: "Hot tub" }],
      home_categories: [],
    }));
    assert.equal(home.slug, "cedar-ridge-cabin");
    assert.equal(home.reviewCount, 0);
    assert.equal(
      home.photos[0].src,
      "http://127.0.0.1:54321/storage/v1/object/public/listing-photos/host_a/live/photo.jpg",
    );
  });
});

describe("host listing repo", () => {
  it("lists snapshots returned by my_listings", async () => {
    const client = {
      rpc: async (name: string) => {
        assert.equal(name, "my_listings");
        return { data: [draftSnapshot], error: null };
      },
    } as unknown as SupabaseClient;
    const snapshots = await listMyListings(client);
    assert.equal(snapshots.length, 1);
    assert.equal(snapshots[0].listing.id, draftSnapshot.listing.id);
    assert.equal(snapshots[0].listing.status, "draft");
  });

  it("returns publish issues when SQL refuses an incomplete listing", async () => {
    const client = {
      rpc: async () => ({
        data: null,
        error: {
          code: "P0001",
          message: "listing incomplete",
          details: JSON.stringify([{ field: "photos", message: "Add at least one photo." }]),
        },
      }),
    } as unknown as SupabaseClient;
    const outcome = await publishListing(client, draftSnapshot.listing.id);
    assert.deepEqual(outcome, {
      published: false,
      issues: [{ field: "photos", message: "Add at least one photo." }],
    });
  });

  it("trims patch strings before save_listing_draft", async () => {
    let sent: { p_listing_id?: string; p_patch?: Record<string, unknown> } = {};
    const client = {
      rpc: async (_name: string, args: { p_listing_id: string; p_patch: Record<string, unknown> }) => {
        sent = args;
        return { data: draftSnapshot, error: null };
      },
    } as unknown as SupabaseClient;
    await saveListingDraft(client, draftSnapshot.listing.id, { name: "  Cedar  " });
    assert.equal(sent.p_listing_id, draftSnapshot.listing.id);
    assert.deepEqual(sent.p_patch, { name: "Cedar" });
  });
});
