import { RepullError } from "./errors.ts";

const REPULL_API = "https://api.repull.dev";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function asText(value: unknown): string {
  if (typeof value === "string" && value.length > 0) {
    return value;
  }
  if (typeof value === "number" && Number.isFinite(value)) {
    return String(value);
  }
  return "";
}

function apiKey(): string {
  const key = Deno.env.get("REPULL_API_KEY");
  if (!key) {
    throw new RepullError("retryable", "repull is not configured");
  }
  return key;
}

async function repullFetch(path: string, init?: RequestInit): Promise<Response> {
  try {
    return await fetch(`${REPULL_API}${path}`, {
      ...init,
      headers: {
        Authorization: `Bearer ${apiKey()}`,
        "Content-Type": "application/json",
        ...(init?.headers ?? {}),
      },
    });
  } catch {
    throw new RepullError("retryable", "repull is unavailable");
  }
}

export type RemoteListing = {
  readonly listingId: string;
  readonly displayName: string;
  readonly platform: "airbnb";
};

export type ReservationSnapshot = {
  readonly id: string;
  readonly listingId: string;
  readonly platform: "airbnb";
  readonly status: string;
  readonly checkIn: string;
  readonly checkOut: string;
  readonly confirmationCode: string;
};

export function parseReservationSnapshot(value: unknown): ReservationSnapshot | null {
  const row = isRecord(value) && isRecord(value.data) ? value.data : value;
  if (!isRecord(row)) {
    return null;
  }
  const id = asText(row.id);
  const listingId = asText(row.listingId) || asText(row.propertyId);
  const platform = (asText(row.platform) || asText(row.source)).toLowerCase();
  if (!id || !listingId || platform !== "airbnb") {
    return null;
  }
  return {
    id,
    listingId,
    platform: "airbnb",
    status: asText(row.status),
    checkIn: asText(row.checkIn),
    checkOut: asText(row.checkOut),
    confirmationCode: asText(row.confirmationCode),
  };
}

export async function fetchReservation(id: string): Promise<ReservationSnapshot | "missing"> {
  const response = await repullFetch(`/v1/reservations/${encodeURIComponent(id)}`);
  if (response.status === 404) {
    return "missing";
  }
  if (!response.ok) {
    throw new RepullError("retryable", "repull reservation fetch failed");
  }
  let body: unknown;
  try {
    body = await response.json();
  } catch {
    throw new RepullError("retryable", "repull reservation fetch failed");
  }
  const snapshot = parseReservationSnapshot(body);
  if (!snapshot) {
    throw new RepullError("retryable", "repull reservation fetch failed");
  }
  return snapshot;
}

export async function fetchListings(): Promise<RemoteListing[]> {
  const response = await repullFetch("/v1/listings");
  if (!response.ok) {
    throw new RepullError("retryable", "repull listing fetch failed");
  }
  let body: unknown;
  try {
    body = await response.json();
  } catch {
    throw new RepullError("retryable", "repull listing fetch failed");
  }
  const rows = Array.isArray(body) ? body : isRecord(body) && Array.isArray(body.data) ? body.data : [];
  const listings: RemoteListing[] = [];
  for (const row of rows) {
    if (!isRecord(row)) {
      continue;
    }
    const listingId = asText(row.id) || asText(row.listingId);
    if (!listingId) {
      continue;
    }
    listings.push({
      listingId,
      displayName: asText(row.name) || asText(row.title) || asText(row.displayName) || listingId,
      platform: "airbnb",
    });
  }
  return listings;
}

export async function fetchReservationsForListing(listingId: string): Promise<ReservationSnapshot[]> {
  const query = new URLSearchParams({ limit: "100", property_id: listingId });
  const response = await repullFetch(`/v1/reservations?${query.toString()}`);
  if (!response.ok) {
    throw new RepullError("retryable", "repull reservation fetch failed");
  }
  let body: unknown;
  try {
    body = await response.json();
  } catch {
    throw new RepullError("retryable", "repull reservation fetch failed");
  }
  const rows = Array.isArray(body) ? body : isRecord(body) && Array.isArray(body.data) ? body.data : [];
  const snapshots: ReservationSnapshot[] = [];
  for (const row of rows) {
    const snapshot = parseReservationSnapshot(row);
    if (snapshot && snapshot.listingId === listingId) {
      snapshots.push(snapshot);
    }
  }
  return snapshots;
}

export async function startAirbnbConnect(redirectUrl: string): Promise<{ url: URL }> {
  const response = await repullFetch("/v1/connect/airbnb", {
    method: "POST",
    body: JSON.stringify({ redirectUrl, accessType: "read_only" }),
  });
  if (!response.ok) {
    throw new RepullError("retryable", "repull connect failed");
  }
  const body = (await response.json()) as { url?: string };
  if (!body.url) {
    throw new RepullError("retryable", "repull connect failed");
  }
  return { url: new URL(body.url) };
}
