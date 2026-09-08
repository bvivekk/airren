import Link from "next/link";
import { notFound } from "next/navigation";
import { getArticle, getCollection, HELP_ARTICLES } from "@/data/help";

export function generateStaticParams() {
  return HELP_ARTICLES.map((article) => ({
    collection: article.collection,
    slug: article.slug,
  }));
}

export default async function HelpArticlePage({
  params,
}: {
  params: Promise<{ collection: string; slug: string }>;
}) {
  const { collection, slug } = await params;
  const article = getArticle(collection, slug);
  const group = getCollection(collection);
  if (!article || !group) {
    notFound();
  }
  return (
    <article className="mx-auto max-w-2xl px-6 py-16">
      <Link href={`/help/${collection}`} className="text-sm text-muted">
        {group.title}
      </Link>
      <h1 className="mt-3 text-4xl font-semibold tracking-tight">{article.title}</h1>
      <p className="mt-6 text-[16px] leading-8">{article.body}</p>
    </article>
  );
}
