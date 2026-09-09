"use client";

import { useRef } from "react";
import type { Home, StayQuery } from "@/domain/home";
import { PropertyCard } from "@/components/PropertyCard";

export function PropertyCarousel({
  title,
  homes,
  query,
  flush,
}: {
  title: string;
  homes: Home[];
  query: StayQuery;
  flush?: boolean;
}) {
  const scroller = useRef<HTMLDivElement>(null);

  function scroll(dir: number) {
    scroller.current?.scrollBy({ left: dir * 420, behavior: "smooth" });
  }

  return (
    <section className={flush ? "pt-8 pb-4" : "mt-16"}>
      <div className="mb-5 flex items-center justify-between">
        <h2 className="text-[22px] font-semibold tracking-tight md:text-2xl">{title}</h2>
        <div className="flex gap-2">
          <button
            type="button"
            aria-label="Previous"
            className="flex h-8 w-8 items-center justify-center rounded-full border border-black/10 bg-white text-lg leading-none text-foreground"
            onClick={() => scroll(-1)}
          >
            ‹
          </button>
          <button
            type="button"
            aria-label="Next"
            className="flex h-8 w-8 items-center justify-center rounded-full border border-black/10 bg-white text-lg leading-none text-foreground"
            onClick={() => scroll(1)}
          >
            ›
          </button>
        </div>
      </div>
      <div
        ref={scroller}
        className="flex gap-4 overflow-x-auto pb-2 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {homes.map((home) => (
          <PropertyCard key={home.slug} home={home} query={query} variant="listing" />
        ))}
      </div>
    </section>
  );
}
