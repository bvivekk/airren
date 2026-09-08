import Image from "next/image";
import { notFound } from "next/navigation";
import { getPost, POSTS } from "@/data/posts";

export function generateStaticParams() {
  return POSTS.map((post) => ({ slug: post.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return { title: getPost(slug)?.title ?? "Post" };
}

export default async function BlogPostPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = getPost(slug);
  if (!post) {
    notFound();
  }
  return (
    <article className="mx-auto max-w-2xl px-6 py-16">
      <p className="text-sm text-muted">
        {post.category} · {post.date}
      </p>
      <h1 className="mt-3 text-4xl font-semibold tracking-tight">{post.title}</h1>
      <div className="relative mt-8 aspect-[16/9] overflow-hidden rounded-3xl">
        <Image src={post.image} alt="" fill className="object-cover" />
      </div>
      <p className="mt-8 text-[16px] leading-8">{post.body}</p>
    </article>
  );
}
