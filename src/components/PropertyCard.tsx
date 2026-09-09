import Image from "next/image";
import Link from "next/link";
import type { Home } from "@/domain/home";
import { badgeLabel } from "@/domain/home";
import { FavoriteButton } from "@/components/FavoriteButton";
import { nightsBetween } from "@/lib/dates";
import { formatUsd, formatUsdApprox } from "@/lib/money";
import { quoteStay, scaledSavingsCents } from "@/lib/pricing";
import type { StayQuery } from "@/domain/home";

export function PropertyCard({
  home,
  query,
  variant,
}: {
  home: Home;
  query: StayQuery;
  variant: "compact" | "cinematic" | "listing";
}) {
  const nights = nightsBetween(query.checkIn, query.checkOut) || 3;
  const quote = quoteStay(home.nightlyRateCents, nights);
  const savings = scaledSavingsCents(home.savingsCents, nights);
  const href = `/homes/${home.slug}?${new URLSearchParams({
    where: query.where,
    checkIn: query.checkIn,
    checkOut: query.checkOut,
    who: String(query.guests),
  }).toString()}`;

  if (variant === "cinematic") {
    return (
      <Link href={href} data-home-card className="group relative block min-w-[280px] flex-[0_0_72%] md:flex-[0_0_32%]">
        <div className="relative aspect-[4/5] overflow-hidden rounded-3xl">
          <Image
            src={home.photos[0]?.src ?? ""}
            alt={home.photos[0]?.alt ?? home.name}
            fill
            className="object-cover transition duration-500 group-hover:scale-[1.03]"
            sizes="(max-width: 768px) 80vw, 32vw"
          />
          <CardOverlays home={home} />
        </div>
      </Link>
    );
  }

  const listing = variant === "listing";

  return (
    <Link
      href={href}
      data-home-card
      className={
        listing
          ? "group block min-w-[240px] flex-[0_0_85%] sm:flex-[0_0_46%] lg:flex-[0_0_calc((100%-4rem)/5)]"
          : "group block"
      }
    >
      <div className="relative aspect-[16/10] overflow-hidden rounded-2xl">
        <Image
          src={home.photos[0]?.src ?? ""}
          alt={home.photos[0]?.alt ?? home.name}
          fill
          className="object-cover transition duration-500 group-hover:scale-[1.03]"
          sizes={listing ? "(max-width: 1024px) 46vw, 20vw" : "(max-width: 768px) 100vw, 25vw"}
        />
        <CardOverlays home={home} />
      </div>
      <div className="mt-3 flex items-start justify-between gap-3">
        <h3 className="text-[15px] font-semibold tracking-tight">{home.name}</h3>
        <span className="shrink-0 text-[13px]">★ {home.rating.toFixed(1)}</span>
      </div>
      <p className="mt-0.5 text-[13px] text-muted">
        {home.beds} beds · {formatUsd(quote.subtotalCents)} for {nights} nights
      </p>
      {savings > 0 ? (
        <p className="mt-0.5 text-[13px] font-medium text-savings">
          {formatUsdApprox(savings)} less than other sites
        </p>
      ) : null}
    </Link>
  );
}

function CardOverlays({ home }: { home: Home }) {
  return (
    <>
      {home.badges[0] ? (
        <span className="absolute left-3 top-3 flex items-center gap-1 rounded-full bg-black/40 px-2.5 py-1 text-[11px] font-medium text-white backdrop-blur-[2px]">
          <span aria-hidden="true">✦</span>
          {badgeLabel(home.badges[0])}
        </span>
      ) : null}
      <div className="absolute right-2 top-2">
        <FavoriteButton slug={home.slug} light />
      </div>
    </>
  );
}
