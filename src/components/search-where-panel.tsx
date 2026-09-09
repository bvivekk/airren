import type { RefObject } from "react";
import { SUGGESTED_DESTINATIONS } from "@/lib/search";

export function SearchWherePanel({
  where,
  onWhere,
  inputRef,
}: {
  where: string;
  onWhere: (value: string) => void;
  inputRef: RefObject<HTMLInputElement | null>;
}) {
  const query = where.trim().toLowerCase();
  const destinations = SUGGESTED_DESTINATIONS.filter((name) =>
    query ? name.toLowerCase().includes(query) : true,
  );

  return (
    <div
      role="dialog"
      aria-label="Where"
      className="absolute top-[calc(100%+10px)] left-0 z-20 w-[min(100vw-2rem,400px)] rounded-[32px] bg-white p-5 shadow-[0_16px_50px_rgba(0,0,0,0.16)]"
    >
      <div className="flex items-center gap-3 border-b border-black/8 pb-3">
        <input
          ref={inputRef}
          value={where}
          onChange={(event) => onWhere(event.target.value)}
          placeholder="Search locations..."
          aria-label="Search locations"
          className="w-full bg-transparent text-[15px] text-foreground outline-none placeholder:text-black/35"
        />
        {where ? (
          <button
            type="button"
            aria-label="Clear location"
            onClick={() => onWhere("")}
            className="flex h-7 w-7 items-center justify-center text-black/35"
          >
            ×
          </button>
        ) : null}
      </div>
      <p className="mt-4 text-[12px] text-muted">Suggested destinations</p>
      <ul className="mt-2">
        {destinations.map((name) => (
          <li key={name}>
            <button
              type="button"
              onClick={() => onWhere(name)}
              className="flex w-full items-center gap-3 rounded-2xl py-3 text-left hover:bg-pill"
            >
              <span className="flex h-10 w-10 items-center justify-center rounded-lg border border-black/10 text-black/50">
                <PinIcon />
              </span>
              <span className="text-[15px] font-semibold">{name}</span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

function PinIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M12 21s7-6.2 7-11.2A7 7 0 1 0 5 9.8C5 14.8 12 21 12 21Z"
        stroke="currentColor"
        strokeWidth="1.6"
      />
      <circle cx="12" cy="10" r="2.2" stroke="currentColor" strokeWidth="1.6" />
    </svg>
  );
}
