import { BlogIndex } from "@/components/BlogIndex";

export const metadata = {
  title: "Blog",
  alternates: { canonical: "/blog" },
};

export default function BlogPage() {
  return <BlogIndex />;
}
