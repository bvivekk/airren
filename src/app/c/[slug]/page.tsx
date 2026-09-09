import { notFound } from "next/navigation";
import { getCategory } from "@/data/categories";
import { homesByCategory } from "@/data/homes";
import { PropertyCard } from "@/components/PropertyCard";
import { parseStayQuery } from "@/lib/query";
import { CATEGORIES } from "@/data/categories";

export function generateStaticParams() {
  return CATEGORIES.map((category) => ({ slug: category.slug }));
}

export default async function CategoryPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const category = getCategory(slug);
  if (!category) {
    notFound();
  }
  const query = parseStayQuery({});
  const homes = homesByCategory(slug);

  return (
    <main className="page-container py-12">
      <h1 className="text-4xl font-semibold tracking-tight">{category.name}</h1>
      <p className="mt-2 text-muted">Homes tagged {category.name.toLowerCase()}.</p>
      {homes.length === 0 ? (
        <p className="mt-10 text-muted">No homes in this category yet.</p>
      ) : (
        <div className="mt-10 grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {homes.map((home) => (
            <PropertyCard key={home.slug} home={home} query={query} variant="compact" />
          ))}
        </div>
      )}
    </main>
  );
}
