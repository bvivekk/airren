import { CATEGORIES, getCategory, type Category } from "../../data/categories.ts";
import { badgeLabel, type Home, type StayQuery } from "../../domain/home.ts";
import { nightsBetween } from "../../lib/dates.ts";
import { formatInr } from "../../lib/money.ts";
import { quoteStay } from "../../lib/pricing.ts";
import { stayQuerySearchParams } from "../../lib/query.ts";

export type PeekCard = {
  slug: string;
  href: string;
  photo: { src: string; alt: string } | null;
  title: string;
  meta: string;
  saved: boolean;
};

export type FeatureCard = {
  slug: string;
  href: string;
  photo: { src: string; alt: string } | null;
  title: string;
  priceLine: string;
  ratingLabel: string;
  badge: string | null;
  saved: boolean;
};

export type MobileExploreSection =
  | { kind: "recently-viewed"; title: "Recently viewed"; cards: readonly [PeekCard, ...PeekCard[]] }
  | { kind: "city"; city: string; title: string; cards: readonly [FeatureCard, ...FeatureCard[]] }
  | { kind: "notice"; title: string; detail: string };

export type MobileExploreFeed = readonly MobileExploreSection[];

export function parseSelectedCategory(
  raw: string | undefined,
  categories: readonly Category[],
): "all" | string {
  if (!raw) {
    return "all";
  }
  return categories.some((category) => category.slug === raw) ? raw : "all";
}

export function featureCardFromHome(
  home: Home,
  query: StayQuery,
  wishlistSlugs: ReadonlySet<string>,
): FeatureCard {
  const nights = nightsBetween(query.checkIn, query.checkOut);
  const quote = quoteStay(home.nightlyRatePaise, nights);
  return {
    slug: home.slug,
    href: homeHref(home.slug, query),
    photo: firstPhoto(home),
    title: home.name,
    priceLine: `${formatInr(quote.subtotalPaise)} for ${nights} ${nights === 1 ? "night" : "nights"}`,
    ratingLabel: ratingOrNew(home),
    badge: featureBadge(home),
    saved: wishlistSlugs.has(home.slug),
  };
}

export function buildMobileExploreFeed(
  homes: readonly Home[],
  query: StayQuery,
  wishlistSlugs: ReadonlySet<string>,
  recentlyViewedSlugs: readonly string[],
  selectedCategory: "all" | string,
): MobileExploreFeed {
  const category = parseSelectedCategory(selectedCategory, CATEGORIES);
  const homesBySlug = new Map(homes.map((home) => [home.slug, home]));
  const sections: MobileExploreSection[] = [];

  const recentCards: PeekCard[] = [];
  for (const slug of recentlyViewedSlugs) {
    const home = homesBySlug.get(slug);
    if (!home) {
      continue;
    }
    recentCards.push(peekCardFromHome(home, query, wishlistSlugs));
  }
  const firstRecent = recentCards[0];
  if (firstRecent) {
    sections.push({
      kind: "recently-viewed",
      title: "Recently viewed",
      cards: [firstRecent, ...recentCards.slice(1)],
    });
  }

  const cityHomes = category === "all" ? homes : homes.filter((home) => home.categoryIds.includes(category));
  const groups = cityGroups(cityHomes);
  if (category !== "all" && groups.length === 0) {
    const label = getCategory(category)?.name ?? "This category";
    sections.push({
      kind: "notice",
      title: `No ${label} homes`,
      detail: "Nothing in the catalog matches this category right now.",
    });
  }
  for (const group of groups) {
    const cards = group.homes.map((home) => featureCardFromHome(home, query, wishlistSlugs));
    const firstCard = cards[0];
    if (!firstCard) {
      continue;
    }
    sections.push({
      kind: "city",
      city: group.city,
      title: `Popular homes in ${group.city}`,
      cards: [firstCard, ...cards.slice(1)],
    });
  }

  return sections;
}

function peekCardFromHome(
  home: Home,
  query: StayQuery,
  wishlistSlugs: ReadonlySet<string>,
): PeekCard {
  const bedLabel = home.beds === 1 ? "1 bed" : `${home.beds} beds`;
  return {
    slug: home.slug,
    href: homeHref(home.slug, query),
    photo: firstPhoto(home),
    title: home.name,
    meta: `${bedLabel} · ${ratingOrNew(home)}`,
    saved: wishlistSlugs.has(home.slug),
  };
}

function ratingOrNew(home: Home): string {
  return home.reviewCount > 0 ? `★ ${home.rating.toFixed(1)}` : "New";
}

function featureBadge(home: Home): string | null {
  if (home.rating >= 4.8 && home.reviewCount >= 10) {
    return "Guest favourite";
  }
  const badge = home.badges[0];
  return badge ? badgeLabel(badge) : null;
}

function firstPhoto(home: Home): { src: string; alt: string } | null {
  const photo = home.photos[0];
  return photo ? { src: photo.src, alt: photo.alt } : null;
}

function homeHref(slug: string, query: StayQuery): string {
  return `/homes/${slug}?${stayQuerySearchParams(query).toString()}`;
}

function cityGroups(homes: readonly Home[]): { city: string; homes: Home[] }[] {
  const groups = new Map<string, Home[]>();
  for (const home of homes) {
    const existing = groups.get(home.location.city);
    if (existing) {
      existing.push(home);
    } else {
      groups.set(home.location.city, [home]);
    }
  }
  return [...groups.entries()]
    .map(([city, cityHomes]) => ({ city, homes: cityHomes }))
    .filter((group) => group.homes.length > 0)
    .sort((a, b) => b.homes.length - a.homes.length || a.city.localeCompare(b.city));
}
