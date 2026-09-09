"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";
import { BLOG_CATEGORIES, POSTS, type BlogCategory } from "@/data/posts";

export function BlogIndex() {
  const [category, setCategory] = useState<BlogCategory>("All");
  const posts = useMemo(
    () => (category === "All" ? POSTS : POSTS.filter((post) => post.category === category)),
    [category],
  );

  return (
    <main className="mx-auto max-w-6xl px-5 py-14 md:px-8">
      <p className="text-sm text-muted">The travel journal</p>
      <h1 className="mt-2 text-5xl font-semibold tracking-tight">Blog</h1>
      <div className="mt-8 flex flex-wrap gap-2">
        {BLOG_CATEGORIES.map((item) => (
          <button
            key={item}
            type="button"
            className={`rounded-full px-4 py-2 text-sm ${item === category ? "bg-pill font-medium" : "text-muted"}`}
            onClick={() => setCategory(item)}
          >
            {item}
          </button>
        ))}
      </div>
      <div className="mt-10 grid grid-cols-1 gap-10 md:grid-cols-3">
        {posts.map((post) => (
          <Link key={post.slug} href={`/blog/${post.slug}`} className="block">
            <div className="relative aspect-[16/10] overflow-hidden rounded-3xl">
              <Image src={post.image} alt="" fill className="object-cover" sizes="(max-width: 768px) 100vw, 33vw" />
            </div>
            <p className="mt-3 text-xs text-muted">
              {post.category} · {post.date}
            </p>
            <h2 className="mt-1 text-lg font-semibold">{post.title}</h2>
            <p className="mt-1 line-clamp-2 text-sm text-muted">{post.excerpt}</p>
          </Link>
        ))}
      </div>
    </main>
  );
}
