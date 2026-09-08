import Link from "next/link";
import { notFound } from "next/navigation";
import { getHome } from "@/data/homes";
import { nightsBetween } from "@/lib/dates";
import { formatInr } from "@/lib/money";
import { quoteStay } from "@/lib/pricing";
import { parseStayQuery } from "@/lib/query";

export default async function BookingDemoPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const slug = typeof params.slug === "string" ? params.slug : "";
  const home = getHome(slug);
  if (!home) {
    notFound();
  }
  const query = parseStayQuery(params);
  const nights = nightsBetween(query.checkIn, query.checkOut);
  const quote = quoteStay(home.nightlyRatePaise, nights || 3);

  return (
    <main className="mx-auto max-w-xl px-6 py-20 text-center">
      <p className="text-sm font-medium text-savings">Hold confirmed</p>
      <h1 className="mt-3 text-3xl font-semibold tracking-tight">You are in at {home.name}</h1>
      <p className="mt-4 text-muted">
        {query.checkIn} – {query.checkOut} · {query.guests} guests · {formatInr(quote.totalPaise)}
      </p>
      <p className="mt-6 text-sm text-muted">No payment was taken. This is a demo hold on Airren.</p>
      <Link href={`/homes/${home.slug}`} className="mt-10 inline-block rounded-full bg-foreground px-5 py-3 text-sm text-white">
        Back to the home
      </Link>
    </main>
  );
}
