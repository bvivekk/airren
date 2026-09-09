"use client";

import { useChrome } from "@/components/ChromeProvider";

export function FavoriteButton({
  slug,
  light,
}: {
  slug: string;
  light?: boolean;
}) {
  const { favorites, toggleFavorite } = useChrome();
  const on = favorites.has(slug);
  return (
    <button
      type="button"
      aria-label={on ? "Remove saved home" : "Save home"}
      aria-pressed={on}
      className={`flex h-9 w-9 items-center justify-center rounded-full ${light ? "text-white" : "text-foreground"}`}
      onClick={(event) => {
        event.preventDefault();
        event.stopPropagation();
        toggleFavorite(slug);
      }}
    >
      <svg width="20" height="18" viewBox="0 0 20 18" fill={on ? "currentColor" : "none"} aria-hidden="true">
        <path
          d="M10 16s-6.5-4.2-8.3-8.1C.4 5.4 1.6 3 4.2 3c1.6 0 2.6.8 3.3 1.8C8.2 3.8 9.2 3 10.8 3c2.6 0 3.8 2.4 2.5 4.9C11.5 11.8 10 16 10 16Z"
          stroke="currentColor"
          strokeWidth="1.4"
        />
      </svg>
    </button>
  );
}
