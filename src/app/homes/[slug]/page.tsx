import { notFound } from "next/navigation";
import { PhotoGrid } from "@/components/PhotoGrid";
import { BookingCard } from "@/components/BookingCard";
import { FavoriteButton } from "@/components/FavoriteButton";
import { getHome, HOMES } from "@/data/homes";
import { parseStayQuery } from "@/lib/query";
import { badgeLabel } from "@/domain/home";

export function generateStaticParams() {
  return HOMES.map((home) => ({ slug: home.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const home = getHome(slug);
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
  const home = getHome(slug);
  if (!home) {
    notFound();
  }
  const query = parseStayQuery(await searchParams);

  return (
    <main className="mx-auto max-w-6xl px-5 py-8 md:px-8">
      <PhotoGrid photos={home.photos} name={home.name} />
      <div className="mt-8 grid gap-10 lg:grid-cols-[1fr_340px]">
        <div>
          <p className="text-sm text-muted">
            {home.type} in {home.location.city}, {home.location.region}
          </p>
          <div className="mt-1 flex items-start justify-between gap-4">
            <h1 className="text-3xl font-semibold tracking-tight">{home.name}</h1>
            <div className="flex items-center gap-2">
              <FavoriteButton slug={home.slug} />
              <span className="text-sm text-muted">Share</span>
            </div>
          </div>
          <p className="mt-3 text-sm">
            ★ {home.rating.toFixed(1)} · {home.reviewCount} reviews · {home.beds} beds · {home.guests} guests
          </p>
          {home.badges.length > 0 ? (
            <p className="mt-2 text-sm">
              {home.badges.map((badge) => badgeLabel(badge)).join(" · ")}
            </p>
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
          <BookingCard home={home} checkIn={query.checkIn} checkOut={query.checkOut} guests={query.guests} />
        </div>
      </div>
    </main>
  );
}
