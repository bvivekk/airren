import { PropertyCard } from "@/components/PropertyCard";
import { filterHomes, searchWindow } from "@/lib/search";
import { emptySearchMessage, parseStayQuery, stayWhenLabel, stayWhoLabel } from "@/lib/query";
import { listHomes } from "@/lib/homes-repo";
import { bookingWindow, loadCalendars } from "@/lib/occupancy-repo";
import { createServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const query = parseStayQuery(params);
  const client = createServerClient();
  const calendars = await loadCalendars(client, searchWindow(query) ?? bookingWindow());
  const results = filterHomes(await listHomes(client), query, calendars);

  return (
    <main className="page-container py-10">
      <h1 className="text-2xl font-semibold tracking-tight">
        {results.length} {results.length === 1 ? "home" : "homes"}
      </h1>
      <p className="mt-1 text-sm text-muted">
        {query.where ? query.where : "Anywhere"} · {stayWhenLabel(query)} · {stayWhoLabel(query)}
      </p>
      {results.length === 0 ? (
        <p className="mt-12 text-muted">{emptySearchMessage(query)}</p>
      ) : (
        <div className="mt-8 grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {results.map(({ home, stay }) => (
            <PropertyCard key={home.slug} home={home} query={query} stay={stay} variant="compact" />
          ))}
        </div>
      )}
    </main>
  );
}
