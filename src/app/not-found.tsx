import Link from "next/link";

export default function NotFound() {
  return (
    <main className="mx-auto max-w-lg px-6 py-24 text-center">
      <h1 className="text-3xl font-semibold">Page not found</h1>
      <p className="mt-3 text-muted">That URL is not on Airren.</p>
      <Link href="/" className="mt-8 inline-block rounded-full bg-foreground px-5 py-3 text-sm text-white">
        Go home
      </Link>
    </main>
  );
}
