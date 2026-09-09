"use client";

import Image from "next/image";
import { useState, type MouseEvent } from "react";
import type { HomePhoto } from "@/domain/home";

export function ListingSlideshow({
  photos,
  name,
  sizes,
  priority = false,
  startIndex = 0,
  variant = "card",
}: {
  photos: HomePhoto[];
  name: string;
  sizes: string;
  priority?: boolean;
  startIndex?: number;
  variant?: "card" | "viewer";
}) {
  const count = photos.length;
  const [index, setIndex] = useState(() => Math.min(Math.max(0, startIndex), Math.max(0, count - 1)));
  const fit = variant ?? "card";

  function go(delta: number, event: MouseEvent<HTMLButtonElement>) {
    event.preventDefault();
    event.stopPropagation();
    setIndex((current) => Math.min(count - 1, Math.max(0, current + delta)));
  }

  if (count === 0) {
    return null;
  }

  return (
    <div className="group absolute inset-0">
      <div className="absolute inset-0 overflow-hidden">
        <div
          data-slot="slideshow-track"
          className="flex h-full transition-transform duration-500 ease-out"
          style={{ transform: `translateX(-${index * 100}%)` }}
        >
          {photos.map((photo, photoIndex) => {
            const firstPriority = priority && photoIndex === 0;
            return (
              <div key={`${photo.src}-${photoIndex}`} className="relative h-full w-full shrink-0">
                <Image
                  src={photo.src}
                  alt={photo.alt || name}
                  fill
                  {...(firstPriority ? { priority: true } : { loading: "eager" as const })}
                  className={photoFitClass(fit)}
                  sizes={sizes}
                />
              </div>
            );
          })}
        </div>
      </div>
      {count > 1 && index > 0 ? (
        <SlideButton direction="prev" variant={fit} onClick={(event) => go(-1, event)} />
      ) : null}
      {count > 1 && index < count - 1 ? (
        <SlideButton direction="next" variant={fit} onClick={(event) => go(1, event)} />
      ) : null}
    </div>
  );
}

function photoFitClass(variant: "card" | "viewer"): string {
  switch (variant) {
    case "card":
      return "object-cover";
    case "viewer":
      return "object-contain";
    default: {
      const _never: never = variant;
      return _never;
    }
  }
}

function slideButtonClass(direction: "prev" | "next", variant: "card" | "viewer"): string {
  const size = variant === "viewer" ? "h-12 w-12" : "h-8 w-8";
  switch (direction) {
    case "prev":
      return `${size} ${variant === "viewer" ? "left-6" : "left-2"}`;
    case "next":
      return `${size} ${variant === "viewer" ? "right-6" : "right-2"}`;
    default: {
      const _never: never = direction;
      return _never;
    }
  }
}

function SlideButton({
  direction,
  variant,
  onClick,
}: {
  direction: "prev" | "next";
  variant: "card" | "viewer";
  onClick: (event: MouseEvent<HTMLButtonElement>) => void;
}) {
  const prev = direction === "prev";
  return (
    <button
      type="button"
      aria-label={prev ? "Previous photo" : "Next photo"}
      className={`pointer-events-none absolute top-1/2 z-10 flex -translate-y-1/2 items-center justify-center rounded-full bg-black/40 text-white opacity-0 shadow-sm transition-colors group-hover:pointer-events-auto group-hover:opacity-100 hover:bg-white hover:text-black ${slideButtonClass(direction, variant)}`}
      onClick={onClick}
    >
      <Chevron direction={direction} />
    </button>
  );
}

function Chevron({ direction }: { direction: "prev" | "next" }) {
  switch (direction) {
    case "prev":
      return (
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
          <path d="M10 3 5 8l5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    case "next":
      return (
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
          <path d="M6 3l5 5-5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    default: {
      const _never: never = direction;
      return _never;
    }
  }
}
