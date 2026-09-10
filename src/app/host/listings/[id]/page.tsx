import { notFound } from "next/navigation";
import { ListingEditor } from "@/components/ListingEditor";
import { getMyListing, loadListingOptions } from "@/lib/host-listings-repo";
import { createServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const snapshot = await getMyListing(createServerClient(), id);
  const name =
    snapshot?.listing.status === "draft"
      ? (snapshot.listing.content.name ?? "Untitled listing")
      : snapshot?.listing.content.name;
  return { title: name ?? "Listing" };
}

export default async function HostListingEditorPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const client = createServerClient();
  const snapshot = await getMyListing(client, id);
  if (!snapshot) {
    notFound();
  }
  const options = await loadListingOptions(client);
  return (
    <main className="mx-auto max-w-5xl px-6 py-16">
      <h1 className="mb-8 text-3xl font-semibold tracking-tight">Edit listing</h1>
      <ListingEditor initial={snapshot} options={options} />
    </main>
  );
}
