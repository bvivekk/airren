import type { HelpArticle } from "../data/help";

export function filterHelpArticles(articles: HelpArticle[], query: string): HelpArticle[] {
  const needle = query.trim().toLowerCase().replace(/-/g, "");
  if (!needle) {
    return articles;
  }
  return articles.filter((article) => {
    const haystack = `${article.title} ${article.body} ${article.collection}`.toLowerCase().replace(/-/g, "");
    return haystack.includes(needle);
  });
}
