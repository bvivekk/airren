import Link from "next/link";
import { CATEGORIES } from "@/data/categories";
import { listHomes } from "@/lib/homes-repo";
import { createServerClient } from "@/lib/supabase/server";

export const metadata = { title: "Locations" };
export const dynamic = "force-dynamic";

const PAGES = [
  { href: "/about", label: "About" },
  { href: "/blog", label: "Blog" },
  { href: "/careers", label: "Careers" },
  { href: "/legal", label: "Legal" },
  { href: "/download", label: "Download App" },
  { href: "/os", label: "Get AirrenOS" },
  { href: "/list", label: "List on Airren" },
  { href: "/events", label: "Events" },
  { href: "/ambassadors", label: "Ambassadors" },
  { href: "/travel-agents", label: "Travel Agents" },
];

export default async function LocationsPage() {
  const homes = await listHomes(createServerClient());
  return (
    <main className="mx-auto max-w-6xl px-6 py-16">
      <h1 className="text-5xl font-semibold tracking-tight">Locations</h1>
      <p className="mt-2 text-muted">Your map to Airren.</p>
      <section className="mt-12">
        <h2 className="text-lg font-semibold">Pages</h2>
        <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2">
          {PAGES.map((page) => (
            <Link key={page.href} href={page.href} className="text-link">
              {page.label}
            </Link>
          ))}
        </div>
      </section>
      <section className="mt-10">
        <h2 className="text-lg font-semibold">Categories</h2>
        <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2">
          {CATEGORIES.map((category) => (
            <Link key={category.slug} href={`/c/${category.slug}`} className="text-link">
              {category.name}
            </Link>
          ))}
        </div>
      </section>
      <section className="mt-10">
        <h2 className="text-lg font-semibold">Properties</h2>
        <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2">
          {homes.map((home) => (
            <Link key={home.slug} href={`/homes/${home.slug}`} className="text-link">
              {home.name}~{home.location.city}~{home.beds} beds
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
}
