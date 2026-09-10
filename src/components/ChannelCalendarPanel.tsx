"use client";

import { useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { HomeId } from "@/domain/occupancy";
import {
  asChannelListingId,
  channelConnections,
  type ChannelConnectionId,
  type MappingModel,
  type MappingStatus,
} from "@/lib/channels";
import { useSupabaseClient } from "@/lib/supabase/browser";

function issueCopy(issue: MappingStatus): string {
  switch (issue.kind) {
    case "ready":
      return "Airbnb nights are occupying this calendar.";
    case "needs_mapping":
      return "An Airbnb listing is connected but not mapped to an Airren home yet.";
    case "conflict":
      return `Airbnb reservation ${issue.reservationId} overlaps nights Airren already sold (${issue.stay.from} – ${issue.stay.to}).`;
    default: {
      const _never: never = issue;
      return _never;
    }
  }
}

export function ChannelCalendarPanel({
  listingId,
  connectionId,
  initialModel,
  issues,
}: {
  listingId: HomeId;
  connectionId: ChannelConnectionId | null;
  initialModel: MappingModel | null;
  issues: readonly MappingStatus[];
}) {
  const supabase = useSupabaseClient();
  const { user } = useUser();
  const router = useRouter();
  const [model, setModel] = useState(initialModel);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const connections = channelConnections(supabase);
  const hostId = user?.id ?? "";

  const connect = async () => {
    if (!hostId) {
      return;
    }
    setPending(true);
    setError("");
    try {
      const { connectUrl } = await connections.startAirbnb({
        requestedBy: { hostId },
        returnTo: `/host/listings/${listingId}/calendar`,
        access: "read_only",
      });
      window.location.assign(connectUrl.toString());
    } catch (connectError) {
      setError(connectError instanceof Error ? connectError.message : "Could not start Airbnb connect.");
      setPending(false);
    }
  };

  const mapToThisHome = async (listing: { listingId: string }) => {
    if (!hostId || !connectionId) {
      return;
    }
    setPending(true);
    setError("");
    try {
      await connections.mapListing({
        connectionId,
        listing: { platform: "airbnb", listingId: asChannelListingId(listing.listingId) },
        homeId: listingId,
        requestedBy: { hostId },
      });
      const next = await connections.mappingModel({ connectionId, requestedBy: { hostId } });
      setModel(next);
      router.refresh();
    } catch (mapError) {
      setError(mapError instanceof Error ? mapError.message : "Could not map that listing.");
    } finally {
      setPending(false);
    }
  };

  const visibleIssues = issues.filter((issue) => issue.kind !== "ready");

  return (
    <section className="rounded-3xl border border-line bg-white p-5">
      <h2 className="text-lg font-semibold">Airbnb calendar</h2>
      <p className="mt-1 text-sm text-muted">
        Connect a read-only Airbnb account so nights sold there occupy this listing on Airren.
      </p>
      {visibleIssues.length > 0 ? (
        <ul className="mt-4 space-y-2">
          {visibleIssues.map((issue, index) => (
            <li key={`${issue.kind}-${index}`} className="rounded-2xl border border-line px-4 py-3 text-sm">
              {issueCopy(issue)}
            </li>
          ))}
        </ul>
      ) : null}
      {!connectionId ? (
        <button
          type="button"
          disabled={pending || !hostId}
          onClick={() => void connect()}
          className="mt-4 rounded-full bg-foreground px-6 py-3 text-sm font-medium text-white disabled:opacity-60"
        >
          Connect Airbnb
        </button>
      ) : (
        <div className="mt-4 space-y-3">
          {model === null || model.listings.length === 0 ? (
            <p className="text-sm text-muted">No Airbnb listings were returned for this connection yet.</p>
          ) : (
            <ul className="divide-y divide-line">
              {model.listings.map((listing) => (
                <li key={listing.listingId} className="flex items-center justify-between gap-4 py-3">
                  <div>
                    <p className="text-sm font-medium">{listing.displayName}</p>
                    <p className="mt-0.5 text-sm text-muted">
                      {listing.mappedHomeId === listingId
                        ? "Mapped to this home"
                        : listing.mappedHomeId
                          ? "Mapped to another home"
                          : "Not mapped"}
                    </p>
                  </div>
                  {listing.mappedHomeId === listingId ? (
                    <span className="text-xs font-medium uppercase tracking-wide text-muted">Mapped</span>
                  ) : (
                    <button
                      type="button"
                      disabled={pending}
                      onClick={() => void mapToThisHome(listing)}
                      className="rounded-full border border-line px-4 py-2 text-sm font-medium disabled:opacity-60"
                    >
                      Map to this home
                    </button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
      {error ? <p className="mt-3 text-sm text-muted">{error}</p> : null}
    </section>
  );
}
