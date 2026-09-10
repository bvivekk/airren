import Link from "next/link";
import { StartListingButton } from "@/components/StartListingButton";
import type { HostListing, PublishReadiness } from "@/domain/listing";
import { listingStatusLabel } from "@/domain/listing";
import { listMyListings } from "@/lib/host-listings-repo";
import { createServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const metadata = { title: "Your listings" };

function listingRowDetail(listing: HostListing, readiness: PublishReadiness): string {
  const status = listing.status;
  switch (status) {
    case "published":
      return "Live on Airren";
    case "unlisted":
      return "Hidden from search";
    case "draft": {
      if (readiness.ready) {
        return "Ready to publish";
      }
      const blocking = readiness.issues.length;
      return `${blocking} ${blocking === 1 ? "thing" : "things"} to finish`;
    }
    default: {
      const _never: never = status;
      return _never;
    }
  }
}

export default async function HostListingsPage() {
  const snapshots = await listMyListings(createServerClient());

  return (
    <main className="mx-auto max-w-2xl px-6 py-16">
      <div className="flex items-end justify-between gap-4">
        <h1 className="text-3xl font-semibold tracking-tight">Your listings</h1>
        <StartListingButton label="New listing" compact />
      </div>
      {snapshots.length === 0 ? (
        <p className="mt-6 text-muted">No listings yet.</p>
      ) : (
        <ul className="mt-8 space-y-4">
          {snapshots.map(({ listing, readiness }) => {
            const name =
              listing.status === "draft" ? (listing.content.name ?? "Untitled listing") : listing.content.name;
            return (
              <li key={listing.id}>
                <Link
                  href={`/host/listings/${listing.id}`}
                  className="block rounded-3xl border border-line bg-white px-5 py-4"
                >
                  <p className="text-sm font-medium text-savings">{listingStatusLabel(listing.status)}</p>
                  <p className="mt-1 text-lg font-semibold">{name}</p>
                  <p className="mt-1 text-sm text-muted">{listingRowDetail(listing, readiness)}</p>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </main>
  );
}
