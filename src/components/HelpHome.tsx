"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { HELP_ARTICLES, HELP_COLLECTIONS } from "@/data/help";
import { filterHelpArticles } from "@/lib/help-search";

export function HelpHome() {
  const [query, setQuery] = useState("");
  const articles = useMemo(() => filterHelpArticles(HELP_ARTICLES, query), [query]);
  const collections = HELP_COLLECTIONS.filter((collection) =>
    articles.some((article) => article.collection === collection.slug),
  );

  return (
    <main className="mx-auto max-w-5xl px-6 py-16">
      <p className="text-center text-xs font-medium tracking-[0.18em] text-muted">AIRREN HELP CENTER</p>
      <h1 className="mt-3 text-center text-4xl font-semibold tracking-tight">Hi, how can we help?</h1>
      <label className="relative mx-auto mt-8 block max-w-xl">
        <span className="sr-only">Search help</span>
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search help..."
          className="w-full rounded-full border border-line px-5 py-3 pr-12 text-sm outline-none"
        />
        <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-muted">⌕</span>
      </label>
      <div className="mt-14 flex items-end justify-between">
        <h2 className="text-xl font-semibold">Popular collections</h2>
        <Link href="/help/searching" className="text-sm text-muted">
          See all
        </Link>
      </div>
      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {collections.map((collection) => {
          const count = articles.filter((article) => article.collection === collection.slug).length;
          return (
            <Link key={collection.slug} href={`/help/${collection.slug}`} className="rounded-3xl bg-pill p-6">
              <h3 className="font-semibold">{collection.title}</h3>
              <p className="mt-2 text-sm text-muted">{count} articles</p>
            </Link>
          );
        })}
      </div>
    </main>
  );
}
