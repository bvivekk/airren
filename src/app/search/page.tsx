import { PropertyCard } from "@/components/PropertyCard";
import { filterHomes } from "@/lib/search";
import { parseStayQuery, stayWhenLabel, stayWhoLabel } from "@/lib/query";
import { listHomes } from "@/lib/homes-repo";
import { createServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const query = parseStayQuery(params);
  const homes = filterHomes(await listHomes(createServerClient()), query);

  return (
    <main className="page-container py-10">
      <h1 className="text-2xl font-semibold tracking-tight">
        {homes.length} {homes.length === 1 ? "home" : "homes"}
      </h1>
      <p className="mt-1 text-sm text-muted">
        {query.where ? query.where : "Anywhere"} · {stayWhenLabel(query)} · {stayWhoLabel(query)}
      </p>
      {homes.length === 0 ? (
        <p className="mt-12 text-muted">No homes match those dates and guests. Try fewer people or another place.</p>
      ) : (
        <div className="mt-8 grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {homes.map((home) => (
            <PropertyCard key={home.slug} home={home} query={query} variant="compact" />
          ))}
        </div>
      )}
    </main>
  );
}
