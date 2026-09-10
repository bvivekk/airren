import Link from "next/link";
import { auth } from "@clerk/nextjs/server";
import { notFound } from "next/navigation";
import { ChannelCalendarPanel } from "@/components/ChannelCalendarPanel";
import { HostListingCalendar } from "@/components/HostListingCalendar";
import { getMyListing } from "@/lib/host-listings-repo";
import {
  asChannelConnectionId,
  channelConnections,
  loadChannelIssues,
  loadHostChannelConnections,
  parseMappingModel,
  type MappingModel,
} from "@/lib/channels";
import { bookingWindow, loadListingCalendar } from "@/lib/occupancy-repo";
import { createServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const snapshot = await getMyListing(createServerClient(), id);
  const name = snapshot?.listing.content.name;
  return { title: name ? `Calendar · ${name}` : "Calendar" };
}

export default async function HostListingCalendarPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ channel?: string }>;
}) {
  const { id } = await params;
  const query = await searchParams;
  const session = await auth();
  const hostId = session.userId ?? "";
  const client = createServerClient();
  const snapshot = await getMyListing(client, id);
  if (!snapshot) {
    notFound();
  }
  const entries = await loadListingCalendar(client, id, bookingWindow());
  const connections = await loadHostChannelConnections(client).catch(() => []);
  const connectionId = query.channel
    ? asChannelConnectionId(query.channel)
    : (connections[0] ?? null);
  let model: MappingModel | null = null;
  if (connectionId && hostId) {
    try {
      model = await channelConnections(client).mappingModel({
        connectionId,
        requestedBy: { hostId },
      });
    } catch {
      const { data } = await client.rpc("repull_mapping_model", { p_connection_id: connectionId });
      try {
        model = data ? parseMappingModel(data) : null;
      } catch {
        model = null;
      }
    }
  }
  const issues = await loadChannelIssues(client, id).catch(() => []);
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
      <div className="space-y-8">
        <ChannelCalendarPanel
          listingId={id}
          connectionId={connectionId}
          initialModel={model}
          issues={issues}
        />
        <HostListingCalendar listingId={id} initialEntries={entries} />
      </div>
    </main>
  );
}
