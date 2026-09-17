import type { MetadataRoute } from "next";
import { POSTS } from "@/data/posts";
import { listHomes } from "@/lib/homes-repo";
import { publicSitemapPaths, siteUrl } from "@/lib/site";
import { createPublicClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const homes = await listHomes(createPublicClient());
  return publicSitemapPaths({
    homeSlugs: homes.map((home) => home.slug),
    blogSlugs: POSTS.map((post) => post.slug),
  }).map((pathname) => ({ url: siteUrl(pathname) }));
}
