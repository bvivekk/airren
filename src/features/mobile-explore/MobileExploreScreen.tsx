"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { FavoriteButton } from "@/components/FavoriteButton";
import { useChrome } from "@/components/ChromeProvider";
import { CATEGORIES } from "@/data/categories";
import type { Home, StayQuery } from "@/domain/home";
import {
  buildMobileExploreFeed,
  type FeatureCard,
  type MobileExploreSection,
  type PeekCard,
} from "@/features/mobile-explore/feed";
import { useRecentlyViewed } from "@/features/mobile-explore/recently-viewed-store";

const CHIP_SCROLL =
  "flex gap-3 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden";
const ROW_SCROLL =
  "flex gap-3 overflow-x-auto pb-2 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden";

export function MobileExploreScreen({
  homes,
  query,
}: {
  homes: readonly Home[];
  query: StayQuery;
}) {
  const [selectedCategory, setSelectedCategory] = useState<"all" | string>("all");
  const { favorites } = useChrome();
  const recentlyViewedSlugs = useRecentlyViewed();
  const feed = buildMobileExploreFeed(homes, query, favorites, recentlyViewedSlugs, selectedCategory);

  return (
    <div className="md:hidden">
      <div className="px-5 pt-[max(1rem,env(safe-area-inset-top))] pb-8">
        <Link
          id="search"
          href="/search"
          className="mt-2 flex h-[3.25rem] w-full items-center gap-3 rounded-full bg-white px-5 text-[15px] text-muted shadow-[0_8px_30px_rgba(0,0,0,0.12)]"
        >
          <SearchMark />
          Start your search
        </Link>
        <div className={`mt-5 ${CHIP_SCROLL}`}>
          <CategoryChip
            slug="all"
            label="All"
            selected={selectedCategory === "all"}
            onSelect={() => setSelectedCategory("all")}
          />
          {CATEGORIES.map((category) => (
            <CategoryChip
              key={category.slug}
              slug={category.slug}
              label={category.name}
              selected={selectedCategory === category.slug}
              onSelect={() => setSelectedCategory(category.slug)}
            />
          ))}
        </div>
        <div className="mt-6 flex flex-col gap-8">
          {feed.map((section) => (
            <ExploreShelf key={sectionKey(section)} section={section} />
          ))}
        </div>
      </div>
    </div>
  );
}

export function MobileFeatureCard({
  card,
  stacked,
}: {
  card: FeatureCard;
  stacked?: boolean;
}) {
  return (
    <Link href={card.href} className={stacked ? "block w-full" : "block w-[78vw] shrink-0"}>
      <div className="relative aspect-[16/10] overflow-hidden rounded-2xl bg-pill">
        <CardPhoto photo={card.photo} title={card.title} sizes="78vw" />
        {card.badge ? (
          <span className="absolute left-3 top-3 rounded-full bg-white/90 px-2.5 py-1 text-[11px] font-medium text-foreground shadow-sm backdrop-blur-[2px]">
            {card.badge}
          </span>
        ) : null}
        <div className="absolute right-2 top-2 drop-shadow-[0_1px_2px_rgba(0,0,0,0.55)]">
          <FavoriteButton slug={card.slug} light />
        </div>
      </div>
      <h3 className="mt-2 truncate text-[15px] font-semibold tracking-tight">{card.title}</h3>
      <p className="mt-0.5 flex items-baseline justify-between gap-3 text-[13px]">
        <span>{card.priceLine}</span>
        <span className="shrink-0">{card.ratingLabel}</span>
      </p>
    </Link>
  );
}

function ExploreShelf({ section }: { section: MobileExploreSection }) {
  switch (section.kind) {
    case "recently-viewed":
      return (
        <section>
          <h2 className="text-[22px] font-semibold tracking-tight">{section.title}</h2>
          <div className={`mt-4 ${ROW_SCROLL}`}>
            {section.cards.map((card) => (
              <PeekCardView key={card.slug} card={card} />
            ))}
          </div>
        </section>
      );
    case "city":
      return (
        <section>
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-[22px] font-semibold tracking-tight">{section.title}</h2>
            <Link
              href={`/search?where=${encodeURIComponent(section.city)}`}
              aria-label={`Search homes in ${section.city}`}
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-foreground"
            >
              <ShelfArrow />
            </Link>
          </div>
          <div className={`mt-4 ${ROW_SCROLL}`}>
            {section.cards.map((card) => (
              <MobileFeatureCard key={card.slug} card={card} />
            ))}
          </div>
        </section>
      );
    case "notice":
      return (
        <section className="rounded-2xl bg-pill px-4 py-6">
          <h2 className="text-[17px] font-semibold tracking-tight">{section.title}</h2>
          <p className="mt-1 text-[14px] text-muted">{section.detail}</p>
        </section>
      );
    default: {
      const _never: never = section;
      return _never;
    }
  }
}

function PeekCardView({ card }: { card: PeekCard }) {
  return (
    <Link href={card.href} className="block w-[42vw] shrink-0">
      <div className="relative aspect-[4/5] overflow-hidden rounded-2xl bg-pill">
        <CardPhoto photo={card.photo} title={card.title} sizes="42vw" />
        <div className="absolute right-2 top-2 drop-shadow-[0_1px_2px_rgba(0,0,0,0.55)]">
          <FavoriteButton slug={card.slug} light />
        </div>
      </div>
      <h3 className="mt-2 truncate text-[15px] font-semibold tracking-tight">{card.title}</h3>
      <p className="mt-0.5 text-[13px] text-muted">{card.meta}</p>
    </Link>
  );
}

function CardPhoto({
  photo,
  title,
  sizes,
}: {
  photo: { src: string; alt: string } | null;
  title: string;
  sizes: string;
}) {
  if (!photo) {
    return null;
  }
  return <Image src={photo.src} alt={photo.alt || title} fill className="object-cover" sizes={sizes} />;
}

function CategoryChip({
  slug,
  label,
  selected,
  onSelect,
}: {
  slug: string;
  label: string;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onSelect}
      className={`flex shrink-0 items-center gap-2 rounded-full border px-3.5 py-2 text-[13px] font-medium ${
        selected ? "border-foreground bg-foreground text-white" : "border-line bg-white text-foreground"
      }`}
    >
      <CategoryIcon slug={slug} />
      {label}
    </button>
  );
}

function sectionKey(section: MobileExploreSection): string {
  switch (section.kind) {
    case "recently-viewed":
      return section.kind;
    case "city":
      return `city:${section.city}`;
    case "notice":
      return section.kind;
    default: {
      const _never: never = section;
      return _never;
    }
  }
}

function SearchMark() {
  return (
    <svg width="18" height="18" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <circle cx="9" cy="9" r="6.25" stroke="currentColor" strokeWidth="1.7" />
      <path d="M13.5 13.5 18 18" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  );
}

function ShelfArrow() {
  return (
    <svg width="18" height="18" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path d="M6 3l5 5-5 5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function CategoryIcon({ slug }: { slug: string }) {
  switch (slug) {
    case "all":
      return <ChipGlyph d="M3 3h6v6H3V3Zm8 0h6v6h-6V3ZM3 11h6v6H3v-6Zm8 0h6v6h-6v-6Z" />;
    case "beach":
      return <ChipGlyph d="M2 14c2-3 5-4 8-4s6 1 8 4M4 10c.8-3 2.6-5 6-6 3.4 1 5.2 3 6 6" />;
    case "mountain":
      return <ChipGlyph d="M2 15 7 6l3 5 2-3 6 7H2Z" />;
    case "ski":
      return <ChipGlyph d="M5 3 4 15M11 3l1 12M3 8h6M9 11h6" />;
    case "lake":
      return <ChipGlyph d="M3 12c2 1.4 4 1.4 6 0s4-1.4 6 0M3 8c2 1.4 4 1.4 6 0s4-1.4 6 0" />;
    case "hawaii":
      return <ChipGlyph d="M10 3c2 3 5 5 6 9-4 1-8 1-12 0 1-4 4-6 6-9Z" />;
    case "pet-friendly":
      return <ChipGlyph d="M7 11c0-2 1.4-3 3-3s3 1 3 3-2 4-3 4-3-2-3-4ZM5 7.5a1.4 1.4 0 1 0 0-2.8 1.4 1.4 0 0 0 0 2.8Zm10 0a1.4 1.4 0 1 0 0-2.8 1.4 1.4 0 0 0 0 2.8ZM7.2 5a1.2 1.2 0 1 0 0-2.4 1.2 1.2 0 0 0 0 2.4Zm5.6 0a1.2 1.2 0 1 0 0-2.4 1.2 1.2 0 0 0 0 2.4Z" />;
    case "groups":
      return <ChipGlyph d="M7 9a2.2 2.2 0 1 0 0-4.4A2.2 2.2 0 0 0 7 9Zm6 0a2.2 2.2 0 1 0 0-4.4A2.2 2.2 0 0 0 13 9ZM4 15c.4-2 2-3 3.8-3h.4C10 12 11.4 13 12 15M12 15c.3-1.6 1.4-2.6 3-2.6h.3c1.5 0 2.5.9 2.7 2.6" />;
    case "national-parks":
      return <ChipGlyph d="M10 3 4 15h12L10 3Zm0 5v4" />;
    case "families":
      return <ChipGlyph d="M7 8a2 2 0 1 0 0-4 2 2 0 0 0 0 4Zm6.5 1.2a1.6 1.6 0 1 0 0-3.2 1.6 1.6 0 0 0 0 3.2ZM3.5 15c.3-2 1.8-3.2 3.5-3.2S10 13 10.3 15M11 15c.2-1.4 1.2-2.2 2.5-2.2s2.3.8 2.5 2.2" />;
    case "forest":
      return <ChipGlyph d="M10 3 5 11h3v5h4v-5h3L10 3Z" />;
    case "city":
      return <ChipGlyph d="M3 16V7l4-3v12M7 16V9h5v7M12 16V5h5v11" />;
    case "desert":
      return <ChipGlyph d="M4 14c2-5 3-8 3-8s1.2 2 2 5c.6-1.4 1.4-2.4 2-2.4.8 2 1.6 5.4 1.6 5.4H4ZM15 8v6" />;
    case "pools":
      return <ChipGlyph d="M3 8h14v5c-2 1.4-4 1.4-7 0s-5-1.4-7 0V8Z" />;
    case "summer":
      return <ChipGlyph d="M10 6.5a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7ZM10 3v1.4M10 15.6V17M3 10h1.4M15.6 10H17M5 5l1 1M14 14l1 1M5 15l1-1M14 6l1-1" />;
    case "fall":
      return <ChipGlyph d="M10 16V9M6 6c2 1 3 3 4 5 1-2 2-4 4-5-1 4-2 7-4 8-2-1-3-4-4-8Z" />;
    default:
      return <ChipGlyph d="M3 16V8l7-5 7 5v8H3Z" />;
  }
}

function ChipGlyph({ d }: { d: string }) {
  return (
    <svg width="16" height="16" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path d={d} stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
    </svg>
  );
}
