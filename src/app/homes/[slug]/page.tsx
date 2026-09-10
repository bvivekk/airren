import { notFound } from "next/navigation";
import { PhotoGrid } from "@/components/PhotoGrid";
import { BookingCard } from "@/components/BookingCard";
import { FavoriteButton } from "@/components/FavoriteButton";
import { ShareButton } from "@/components/ShareButton";
import { parseStayQuery } from "@/lib/query";
import { badgeLabel, type Home } from "@/domain/home";
import { getHomeBySlug } from "@/lib/homes-repo";
import { bookingWindow, loadCalendars } from "@/lib/occupancy-repo";
import { createServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const home = await getHomeBySlug(createServerClient(), slug);
  return { title: home?.name ?? "Home" };
}

export default async function HomeDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { slug } = await params;
  const client = createServerClient();
  const home = await getHomeBySlug(client, slug);
  if (!home) {
    notFound();
  }
  const calendars = await loadCalendars(client, bookingWindow(), home.id);
  const query = parseStayQuery(await searchParams);
  const guestFavourite = home.rating >= 4.8 && home.reviewCount >= 10;

  return (
    <main className="mx-auto max-w-6xl px-5 py-6 md:px-8 md:py-8">
      <div className="mb-6 flex items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold tracking-tight md:text-[26px]">{home.name}</h1>
        <div className="flex shrink-0 items-center gap-4 pt-1">
          <ShareButton title={home.name} />
          <FavoriteButton slug={home.slug} labeled />
        </div>
      </div>
      <PhotoGrid photos={home.photos} name={home.name} />
      <div className="mt-8 grid gap-10 lg:grid-cols-[minmax(0,1fr)_372px] lg:gap-16">
        <div>
          <h2 className="text-[22px] font-semibold tracking-tight">
            {home.type} in {home.location.city}, {home.location.region}, {home.location.country}
          </h2>
          <p className="mt-1 text-[15px] text-foreground/90">{capacityLine(home)}</p>
          {home.badges.length > 0 ? (
            <div className="mt-3 flex flex-wrap gap-2">
              {home.badges.map((badge) => (
                <span key={badge} className="rounded-full bg-pill px-3 py-1 text-xs font-medium">
                  {badgeLabel(badge)}
                </span>
              ))}
            </div>
          ) : null}
          {home.reviewCount > 0 ? (
            <div className="mt-6 flex flex-col gap-4 rounded-xl border border-line px-5 py-5 sm:flex-row sm:items-center">
              {guestFavourite ? (
                <>
                  <div className="flex shrink-0 items-center gap-2 font-semibold">
                    <Laurel />
                    Guest favourite
                    <Laurel flip />
                  </div>
                  <p className="max-w-[220px] text-sm leading-5">
                    One of the most loved homes on Airren, according to guests
                  </p>
                </>
              ) : null}
              <div className="flex shrink-0 items-center gap-4 sm:ml-auto">
                <div className="text-center">
                  <p className="text-lg font-semibold leading-none">{formatRating(home.rating)}</p>
                  <StarRow />
                </div>
                <div className="h-10 w-px bg-line" />
                <div className="text-center">
                  <p className="text-lg font-semibold leading-none">{home.reviewCount}</p>
                  <p className="mt-1 text-xs font-medium underline underline-offset-2">
                    {home.reviewCount === 1 ? "Review" : "Reviews"}
                  </p>
                </div>
              </div>
            </div>
          ) : null}
          <p className="mt-8 max-w-2xl text-[15px] leading-7 text-foreground/90">{home.description}</p>
          <h2 className="mt-10 text-lg font-semibold">Amenities</h2>
          <ul className="mt-3 grid grid-cols-1 gap-2 text-sm sm:grid-cols-2">
            {home.amenities.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
        <div className="lg:sticky lg:top-24 lg:self-start">
          <BookingCard
            home={home}
            calendar={calendars.dataFor(home.id)}
            checkIn={query.checkIn}
            checkOut={query.checkOut}
            guests={query.guests}
          />
        </div>
      </div>
    </main>
  );
}

function capacityLine(home: Home): string {
  return [
    countLabel(home.guests, "guest", "guests"),
    countLabel(home.beds, "bed", "beds"),
    countLabel(home.baths, "bathroom", "bathrooms"),
  ].join(" · ");
}

function countLabel(count: number, singular: string, plural: string): string {
  return `${count} ${count === 1 ? singular : plural}`;
}

function formatRating(rating: number): string {
  const rounded = Math.round(rating * 100) / 100;
  return Number.isInteger(rounded) ? rounded.toFixed(1) : String(rounded);
}

function StarRow() {
  return (
    <span className="mt-1 flex justify-center gap-px" aria-hidden="true">
      {Array.from({ length: 5 }, (_, index) => (
        <svg key={index} width="9" height="9" viewBox="0 0 12 12" fill="currentColor">
          <path d="M6 0.8 7.4 4.2 11.1 4.5 8.3 6.9 9.2 10.6 6 8.7 2.8 10.6 3.7 6.9 0.9 4.5 4.6 4.2Z" />
        </svg>
      ))}
    </span>
  );
}

function Laurel({ flip = false }: { flip?: boolean }) {
  return (
    <svg
      width="18"
      height="28"
      viewBox="0 0 18 28"
      fill="none"
      aria-hidden="true"
      className={flip ? "-scale-x-100" : undefined}
    >
      <path
        d="M14.5 3c-3.2 2.4-5.2 6.4-5.2 11 0 4.6 2 8.6 5.2 11-4.8-1.2-8.3-6-8.3-11S9.7 4.2 14.5 3Z"
        stroke="#C4A35A"
        strokeWidth="1.2"
      />
      <path d="M9.4 8.2c-1.4.6-2.6 2-3.2 3.6" stroke="#C4A35A" strokeWidth="1.1" strokeLinecap="round" />
      <path d="M9.4 13.2c-1.5.4-2.8 1.6-3.5 3.2" stroke="#C4A35A" strokeWidth="1.1" strokeLinecap="round" />
      <path d="M9.6 18c-1.4.6-2.5 1.8-3 3.2" stroke="#C4A35A" strokeWidth="1.1" strokeLinecap="round" />
    </svg>
  );
}
