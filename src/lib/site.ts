export const SITE_ORIGIN = "https://airren.in";

export const PUBLIC_SITEMAP_PATHS = [
  "/",
  "/about",
  "/locations",
  "/list",
  "/os",
  "/help",
  "/blog",
] as const;

export function siteUrl(pathname: string): string {
  if (!pathname.startsWith("/")) {
    throw new Error(`pathname must start with /: ${pathname}`);
  }
  if (pathname.includes("?") || pathname.includes("#")) {
    throw new Error(`pathname must not include query or hash: ${pathname}`);
  }
  if (pathname !== "/" && pathname.endsWith("/")) {
    throw new Error(`pathname must not have a trailing slash: ${pathname}`);
  }
  return pathname === "/" ? SITE_ORIGIN : `${SITE_ORIGIN}${pathname}`;
}

export function publicSitemapPaths(input: { homeSlugs: string[]; blogSlugs: string[] }): string[] {
  const blogPaths = [...input.blogSlugs]
    .sort((left, right) => left.localeCompare(right))
    .map((slug) => `/blog/${slug}`);
  const homePaths = [...input.homeSlugs]
    .sort((left, right) => left.localeCompare(right))
    .map((slug) => `/homes/${slug}`);
  return [...PUBLIC_SITEMAP_PATHS, ...blogPaths, ...homePaths];
}
