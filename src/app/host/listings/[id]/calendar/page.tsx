import Link from "next/link";
import { notFound } from "next/navigation";
import { HostListingCalendar } from "@/components/HostListingCalendar";
import { getMyListing } from "@/lib/host-listings-repo";
import { bookingWindow, loadListingCalendar } from "@/lib/occupancy-repo";
import { createServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const snapshot = await getMyListing(createServerClient(), id);
  const name = snapshot?.listing.content.name;
  return { title: name ? `Calendar · ${name}` : "Calendar" };
}

export default async function HostListingCalendarPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const client = createServerClient();
  const snapshot = await getMyListing(client, id);
  if (!snapshot) {
    notFound();
  }
  const entries = await loadListingCalendar(client, id, bookingWindow());
  return (
    <main className="page-container max-w-5xl py-16">
      <div className="mb-8 flex items-center justify-between gap-4">
        <h1 className="text-3xl font-semibold tracking-tight">Calendar</h1>
        <Link
          href={`/host/listings/${id}`}
          className="rounded-full border border-line px-4 py-2 text-sm font-medium"
        >
          Edit listing
        </Link>
      </div>
      <HostListingCalendar listingId={id} initialEntries={entries} />
    </main>
  );
}
