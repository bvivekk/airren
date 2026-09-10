import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { resolveStoragePhotoSrc, storagePhotoSrc } from "./photo-src.ts";

describe("photo-src", () => {
  it("encodes a storage path without a host", () => {
    assert.equal(
      storagePhotoSrc("listing-photos", "user_1/listing-id/photo.jpg"),
      "storage:listing-photos/user_1/listing-id/photo.jpg",
    );
  });

  it("resolves a storage src against NEXT_PUBLIC_SUPABASE_URL", () => {
    const previous = process.env.NEXT_PUBLIC_SUPABASE_URL;
    process.env.NEXT_PUBLIC_SUPABASE_URL = "http://127.0.0.1:54321";
    try {
      assert.equal(
        resolveStoragePhotoSrc("storage:listing-photos/user_1/listing-id/photo.jpg"),
        "http://127.0.0.1:54321/storage/v1/object/public/listing-photos/user_1/listing-id/photo.jpg",
      );
    } finally {
      process.env.NEXT_PUBLIC_SUPABASE_URL = previous;
    }
  });

  it("leaves https URLs unchanged", () => {
    assert.equal(
      resolveStoragePhotoSrc("https://images.unsplash.com/photo.jpg"),
      "https://images.unsplash.com/photo.jpg",
    );
  });
});
