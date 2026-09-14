"use client";

import { useChrome } from "@/components/ChromeProvider";
import { MobileFeatureCard } from "@/features/mobile-explore/MobileExploreScreen";
import { featureCardFromHome } from "@/features/mobile-explore/feed";
import type { Home, StayQuery } from "@/domain/home";

export function MobileWishlistScreen({
  homes,
  query,
}: {
  homes: readonly Home[];
  query: StayQuery;
}) {
  const { favorites } = useChrome();
  const homesBySlug = new Map(homes.map((home) => [home.slug, home]));
  const cards = [];
  for (const slug of favorites) {
    const home = homesBySlug.get(slug);
    if (home) {
      cards.push(featureCardFromHome(home, query, favorites));
    }
  }

  return (
    <main className="px-5 pt-6 pb-10">
      <h1 className="text-[22px] font-semibold tracking-tight">Wishlists</h1>
      {cards.length === 0 ? (
        <div className="mt-10">
          <p className="text-[17px] font-semibold">No saved homes yet</p>
          <p className="mt-2 text-[15px] text-muted">Tap the heart on a home to save it here.</p>
        </div>
      ) : (
        <div className="mt-6 flex flex-col gap-6">
          {cards.map((card) => (
              <MobileFeatureCard key={card.slug} card={card} stacked />
          ))}
        </div>
      )}
    </main>
  );
}
