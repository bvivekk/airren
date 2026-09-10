import type { SupabaseClient } from "@supabase/supabase-js";
import { stay, type HomeId, type Stay } from "../domain/occupancy.ts";

declare const connectionIdBrand: unique symbol;
declare const channelListingIdBrand: unique symbol;

export type ChannelConnectionId = string & {
  readonly [connectionIdBrand]: true;
};
export type ChannelListingId = string & {
  readonly [channelListingIdBrand]: true;
};
export type ChannelPlatform = "airbnb";
export type ChannelAccess = "read_only";

export type HostActor = {
  readonly hostId: string;
};

export type MappingStatus =
  | { readonly kind: "ready" }
  | { readonly kind: "needs_mapping" }
  | {
      readonly kind: "conflict";
      readonly reservationId: string;
      readonly stay: Stay;
      readonly resolvedAt?: string | null;
    };

export type MappingModel = {
  readonly connectionId: ChannelConnectionId;
  readonly access: ChannelAccess;
  readonly listings: readonly {
    readonly platform: ChannelPlatform;
    readonly listingId: ChannelListingId;
    readonly displayName: string;
    readonly mappedHomeId: HomeId | null;
    readonly status: MappingStatus;
  }[];
  readonly issues: readonly MappingStatus[];
};

export interface ChannelConnections {
  startAirbnb(input: {
    requestedBy: HostActor;
    returnTo: string;
    access: "read_only";
  }): Promise<{ connectUrl: URL }>;

  finishAirbnb(input: {
    callbackUrl: string;
    requestedBy: HostActor;
  }): Promise<{ connectionId: ChannelConnectionId; returnTo: string }>;

  mappingModel(input: {
    connectionId: ChannelConnectionId;
    requestedBy: HostActor;
  }): Promise<MappingModel>;

  mapListing(input: {
    connectionId: ChannelConnectionId;
    listing: {
      platform: "airbnb";
      listingId: ChannelListingId;
    };
    homeId: HomeId;
    requestedBy: HostActor;
  }): Promise<MappingStatus>;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function asText(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function appOrigin(): string {
  if (typeof window !== "undefined") {
    return window.location.origin;
  }
  return process.env.NEXT_PUBLIC_APP_URL ?? "http://127.0.0.1:3000";
}

export function asChannelConnectionId(value: string): ChannelConnectionId {
  return value as ChannelConnectionId;
}

export function asChannelListingId(value: string): ChannelListingId {
  return value as ChannelListingId;
}

export function parseMappingStatus(value: unknown): MappingStatus {
  if (!isRecord(value) || typeof value.kind !== "string") {
    throw new Error("mapping status must be an object");
  }
  switch (value.kind) {
    case "ready":
      return { kind: "ready" };
    case "needs_mapping":
      return { kind: "needs_mapping" };
    case "conflict": {
      const nights = isRecord(value.stay)
        ? stay(asText(value.stay.from), asText(value.stay.to))
        : null;
      if (!nights || typeof value.reservationId !== "string") {
        throw new Error("conflict status must name a reservation stay");
      }
      return {
        kind: "conflict",
        reservationId: value.reservationId,
        stay: nights,
        resolvedAt: typeof value.resolvedAt === "string" || value.resolvedAt === null ? value.resolvedAt : null,
      };
    }
    default:
      throw new Error(`unknown mapping status: ${value.kind}`);
  }
}

export function parseMappingModel(value: unknown): MappingModel {
  if (!isRecord(value) || typeof value.connectionId !== "string" || value.access !== "read_only") {
    throw new Error("mapping model must include a read_only connection");
  }
  if (!Array.isArray(value.listings) || !Array.isArray(value.issues)) {
    throw new Error("mapping model must include listings and issues");
  }
  return {
    connectionId: asChannelConnectionId(value.connectionId),
    access: "read_only",
    listings: value.listings.map((row) => {
      if (
        !isRecord(row) ||
        row.platform !== "airbnb" ||
        typeof row.listingId !== "string" ||
        typeof row.displayName !== "string"
      ) {
        throw new Error("mapping listing is invalid");
      }
      return {
        platform: "airbnb" as const,
        listingId: asChannelListingId(row.listingId),
        displayName: row.displayName,
        mappedHomeId: typeof row.mappedHomeId === "string" ? row.mappedHomeId : null,
        status: parseMappingStatus(row.status),
      };
    }),
    issues: value.issues.map(parseMappingStatus),
  };
}

async function invokeConnect(client: SupabaseClient, body: Record<string, unknown>): Promise<unknown> {
  const { data, error } = await client.functions.invoke("repull-connect", { body });
  if (error) {
    throw new Error(error.message || "channel request failed");
  }
  if (isRecord(data) && typeof data.error === "string") {
    throw new Error(data.error);
  }
  return data;
}

export function channelConnections(client: SupabaseClient): ChannelConnections {
  return {
    async startAirbnb(input) {
      if (input.access !== "read_only") {
        throw new Error("only read_only Airbnb access is offered");
      }
      const data = await invokeConnect(client, {
        action: "start",
        returnTo: input.returnTo,
        origin: appOrigin(),
        requestedBy: input.requestedBy.hostId,
      });
      if (!isRecord(data) || typeof data.connectUrl !== "string") {
        throw new Error("could not start Airbnb connect");
      }
      return { connectUrl: new URL(data.connectUrl) };
    },
    async finishAirbnb(input) {
      const data = await invokeConnect(client, {
        action: "finish",
        callbackUrl: input.callbackUrl,
        requestedBy: input.requestedBy.hostId,
      });
      if (!isRecord(data) || typeof data.connectionId !== "string") {
        throw new Error("could not finish Airbnb connect");
      }
      return {
        connectionId: asChannelConnectionId(data.connectionId),
        returnTo: typeof data.returnTo === "string" ? data.returnTo : "/host/listings",
      };
    },
    async mappingModel(input) {
      const data = await invokeConnect(client, {
        action: "mappingModel",
        connectionId: input.connectionId,
        requestedBy: input.requestedBy.hostId,
      });
      return parseMappingModel(data);
    },
    async mapListing(input) {
      const data = await invokeConnect(client, {
        action: "mapListing",
        connectionId: input.connectionId,
        listing: input.listing,
        homeId: input.homeId,
        requestedBy: input.requestedBy.hostId,
      });
      return parseMappingStatus(data);
    },
  };
}

export const channels: {
  readonly connections: ChannelConnections;
} = {
  get connections(): ChannelConnections {
    throw new Error("use channelConnections(client) with a signed-in host client");
  },
};

export async function loadHostChannelConnections(client: SupabaseClient): Promise<ChannelConnectionId[]> {
  const { data, error } = await client.rpc("list_repull_connections");
  if (error) {
    throw new Error(error.message);
  }
  if (!Array.isArray(data)) {
    return [];
  }
  return data.flatMap((row) =>
    isRecord(row) && typeof row.connectionId === "string" ? [asChannelConnectionId(row.connectionId)] : [],
  );
}

export async function loadChannelIssues(client: SupabaseClient, homeId: HomeId): Promise<MappingStatus[]> {
  const { data, error } = await client.rpc("channel_issues_for_home", { p_home_id: homeId });
  if (error) {
    throw new Error(error.message);
  }
  if (!Array.isArray(data)) {
    return [];
  }
  return data.map(parseMappingStatus);
}

export function echoChannelStay(): never {
  throw new Error("channel echo export is not implemented");
}
