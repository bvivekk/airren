import Link from "next/link";
import { notFound } from "next/navigation";
import { articlesIn, getCollection, HELP_COLLECTIONS } from "@/data/help";

export function generateStaticParams() {
  return HELP_COLLECTIONS.map((collection) => ({ collection: collection.slug }));
}

export default async function HelpCollectionPage({
  params,
}: {
  params: Promise<{ collection: string }>;
}) {
  const { collection: slug } = await params;
  const collection = getCollection(slug);
  if (!collection) {
    notFound();
  }
  const articles = articlesIn(slug);
  return (
    <main className="mx-auto max-w-3xl px-6 py-16">
      <Link href="/help" className="text-sm text-muted">
        Help
      </Link>
      <h1 className="mt-3 text-4xl font-semibold">{collection.title}</h1>
      <p className="mt-2 text-muted">{collection.blurb}</p>
      <ul className="mt-8 space-y-3">
        {articles.map((article) => (
          <li key={article.slug}>
            <Link href={`/help/${slug}/${article.slug}`} className="text-link">
              {article.title}
            </Link>
          </li>
        ))}
      </ul>
    </main>
  );
}
