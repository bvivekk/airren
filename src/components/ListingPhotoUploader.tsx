"use client";

import Image from "next/image";
import { useState } from "react";
import type { ListingPhoto } from "@/domain/listing";

function PhotoAltInput({
  photoId,
  alt,
  pending,
  onCommit,
}: {
  photoId: string;
  alt: string;
  pending: boolean;
  onCommit: (id: string, nextAlt: string) => void;
}) {
  const [value, setValue] = useState(alt);
  return (
    <input
      value={value}
      disabled={pending}
      onChange={(event) => setValue(event.target.value)}
      onBlur={() => {
        if (value !== alt) {
          onCommit(photoId, value);
        }
      }}
      className="w-full rounded-full border border-line px-4 py-2 text-sm outline-none"
      placeholder="Alt text"
    />
  );
}

export function ListingPhotoUploader({
  photos,
  pending,
  onUpload,
  onChange,
}: {
  photos: ListingPhoto[];
  pending: boolean;
  onUpload: (file: File) => void;
  onChange: (photos: Array<{ id: string; alt: string }>) => void;
}) {
  function ordered(ids: ListingPhoto[]): Array<{ id: string; alt: string }> {
    return ids.map((photo) => ({ id: photo.id, alt: photo.alt }));
  }

  return (
    <div className="space-y-4">
      <label className="block text-sm font-medium">
        Photos
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp"
          disabled={pending}
          className="mt-2 block w-full text-sm text-muted file:mr-3 file:rounded-full file:border-0 file:bg-pill file:px-4 file:py-2 file:text-sm file:font-medium file:text-foreground"
          onChange={(event) => {
            const file = event.target.files?.[0];
            event.target.value = "";
            if (file) {
              onUpload(file);
            }
          }}
        />
      </label>
      {photos.length === 0 ? <p className="text-sm text-muted">Add at least one photo.</p> : null}
      <ul className="space-y-3">
        {photos.map((photo, index) => (
          <li key={photo.id} className="flex gap-3 rounded-2xl border border-line bg-white p-3">
            <div className="relative h-20 w-28 shrink-0 overflow-hidden rounded-xl bg-pill">
              {photo.src.startsWith("http") || photo.src.startsWith("/") ? (
                <Image src={photo.src} alt={photo.alt} fill className="object-cover" />
              ) : (
                <div className="h-full w-full bg-pill" />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <PhotoAltInput
                photoId={photo.id}
                alt={photo.alt}
                pending={pending}
                onCommit={(id, nextAlt) => {
                  onChange(photos.map((item) => ({ id: item.id, alt: item.id === id ? nextAlt : item.alt })));
                }}
              />
              <div className="mt-2 flex gap-2">
                <button
                  type="button"
                  disabled={pending || index === 0}
                  className="rounded-full border border-line px-3 py-1 text-xs disabled:opacity-40"
                  onClick={() => {
                    const next = ordered(photos);
                    const current = next[index];
                    const above = next[index - 1];
                    if (!current || !above) {
                      return;
                    }
                    next[index - 1] = current;
                    next[index] = above;
                    onChange(next);
                  }}
                >
                  Up
                </button>
                <button
                  type="button"
                  disabled={pending || index === photos.length - 1}
                  className="rounded-full border border-line px-3 py-1 text-xs disabled:opacity-40"
                  onClick={() => {
                    const next = ordered(photos);
                    const current = next[index];
                    const below = next[index + 1];
                    if (!current || !below) {
                      return;
                    }
                    next[index + 1] = current;
                    next[index] = below;
                    onChange(next);
                  }}
                >
                  Down
                </button>
                <button
                  type="button"
                  disabled={pending}
                  className="rounded-full border border-line px-3 py-1 text-xs disabled:opacity-40"
                  onClick={() => {
                    onChange(ordered(photos.filter((_, itemIndex) => itemIndex !== index)));
                  }}
                >
                  Remove
                </button>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
