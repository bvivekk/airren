"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import type { HomePhoto } from "@/domain/home";
import { ListingSlideshow } from "@/components/ListingSlideshow";

export function PhotoGrid({ photos, name }: { photos: HomePhoto[]; name: string }) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const mosaic = photos.slice(0, 5);
  const feature = mosaic[0];

  useEffect(() => {
    if (openIndex === null) {
      return;
    }
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpenIndex(null);
      }
    }
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", onKey);
    };
  }, [openIndex]);

  if (!feature) {
    return <div className="h-[240px] rounded-xl bg-pill md:h-[420px]" />;
  }

  return (
    <>
      <div data-slot="listing-gallery" className="relative">
        <div className="listing-mosaic">
          {mosaic.map((photo, index) => (
            <button
              key={`${photo.src}-${index}`}
              type="button"
              className="relative min-h-0 cursor-pointer overflow-hidden after:absolute after:inset-0 after:bg-black/0 after:transition-colors hover:after:bg-black/15"
              onClick={() => setOpenIndex(index)}
            >
              <Image
                src={photo.src}
                alt={photo.alt || name}
                fill
                priority={index === 0}
                className="object-cover"
                sizes={index === 0 ? "(max-width: 768px) 100vw, 50vw" : "(max-width: 768px) 50vw, 25vw"}
              />
            </button>
          ))}
        </div>
        {photos.length > 1 ? (
          <button
            type="button"
            data-slot="show-all-photos"
            className="absolute bottom-3 right-3 z-20 inline-flex items-center gap-2 rounded-xl border border-foreground/25 bg-white px-3.5 py-2 text-sm font-semibold shadow-sm"
            onClick={() => setOpenIndex(0)}
          >
            <GridIcon />
            Show all photos
          </button>
        ) : null}
      </div>
      {openIndex !== null ? (
        <div
          className="fixed inset-0 z-[200] bg-black"
          role="dialog"
          aria-modal="true"
          aria-label={`${name} photos`}
        >
          <button
            type="button"
            className="absolute left-5 top-5 z-20 rounded-full bg-white px-4 py-2 text-sm font-medium"
            onClick={() => setOpenIndex(null)}
          >
            Close
          </button>
          <div className="relative h-full w-full">
            <ListingSlideshow
              key={openIndex}
              photos={photos}
              name={name}
              sizes="100vw"
              startIndex={openIndex}
              variant="viewer"
            />
          </div>
        </div>
      ) : null}
    </>
  );
}

function GridIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
      <rect x="1" y="1" width="3.5" height="3.5" rx="0.5" />
      <rect x="6.25" y="1" width="3.5" height="3.5" rx="0.5" />
      <rect x="11.5" y="1" width="3.5" height="3.5" rx="0.5" />
      <rect x="1" y="6.25" width="3.5" height="3.5" rx="0.5" />
      <rect x="6.25" y="6.25" width="3.5" height="3.5" rx="0.5" />
      <rect x="11.5" y="6.25" width="3.5" height="3.5" rx="0.5" />
      <rect x="1" y="11.5" width="3.5" height="3.5" rx="0.5" />
      <rect x="6.25" y="11.5" width="3.5" height="3.5" rx="0.5" />
      <rect x="11.5" y="11.5" width="3.5" height="3.5" rx="0.5" />
    </svg>
  );
}
