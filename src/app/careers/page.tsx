import { publicSite } from "@/lib/public-site";

export default function CareersPage() {
  const mailbox = publicSite().hello;
  return (
    <main className="mx-auto max-w-xl px-6 py-20">
      <h1 className="text-4xl font-semibold">Careers</h1>
      <p className="mt-3 text-muted">
        No open roles in this demo. Write <a href={`mailto:${mailbox}`}>{mailbox}</a> if you want to
        build homes and software together.
      </p>
    </main>
  );
}
