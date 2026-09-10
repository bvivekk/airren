import { createClient, type SupabaseClient } from "npm:@supabase/supabase-js@2";
import { requireClerkUser } from "../clerk.ts";
import { corsHeaders, jsonResponse } from "../http.ts";
import {
  fetchListings,
  fetchReservationsForListing,
  startAirbnbConnect,
  type RemoteListing,
} from "./api.ts";
import { commandFromReconciliation } from "./command.ts";
import { RepullError } from "./errors.ts";
import { project } from "./projector.ts";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function asText(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function userClient(token: string): SupabaseClient {
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabaseKey = Deno.env.get("SUPABASE_ANON_KEY") ?? Deno.env.get("SUPABASE_PUBLISHABLE_KEY");
  if (!supabaseUrl || !supabaseKey) {
    throw new RepullError("retryable", "supabase is not configured");
  }
  return createClient(supabaseUrl, supabaseKey, {
    accessToken: async () => token,
  });
}

function adminClient(): SupabaseClient {
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceKey) {
    throw new RepullError("retryable", "supabase is not configured");
  }
  return createClient(supabaseUrl, serviceKey);
}

async function cacheListings(connectionId: string, listings: RemoteListing[]): Promise<void> {
  const { error } = await adminClient().rpc("replace_repull_remote_listings", {
    p_connection_id: connectionId,
    p_listings: listings,
  });
  if (error) {
    throw new RepullError("retryable", error.message);
  }
}

async function reconcileListing(listingId: string): Promise<void> {
  const snapshots = await fetchReservationsForListing(listingId);
  for (const snapshot of snapshots) {
    const command = await commandFromReconciliation(snapshot);
    await project(command);
  }
}

async function handleStart(body: Record<string, unknown>, token: string): Promise<Response> {
  const returnTo = asText(body.returnTo);
  const origin = asText(body.origin);
  const { data, error } = await userClient(token).rpc("start_repull_connect_attempt", {
    p_return_to: returnTo,
  });
  if (error) {
    throw new RepullError("invalid", error.message);
  }
  if (!isRecord(data) || typeof data.stateDigest !== "string") {
    throw new RepullError("retryable", "connect attempt failed");
  }
  const callback = new URL("/host/channels/callback", origin || "http://127.0.0.1:3000");
  callback.searchParams.set("state", data.stateDigest);
  const session = await startAirbnbConnect(callback.toString());
  return jsonResponse({ connectUrl: session.url.toString() });
}

async function handleFinish(body: Record<string, unknown>, token: string, hostSub: string): Promise<Response> {
  const callbackUrl = asText(body.callbackUrl);
  let parsed: URL;
  try {
    parsed = new URL(callbackUrl);
  } catch {
    throw new RepullError("invalid", "invalid callback");
  }
  const status = parsed.searchParams.get("status") ?? "";
  const state = parsed.searchParams.get("state") ?? "";
  const accountId = parsed.searchParams.get("accountId") ?? "";
  const hostId = parsed.searchParams.get("hostId") ?? "";
  if (status !== "connected") {
    throw new RepullError("invalid", status === "expired" ? "connect attempt expired" : "connection cancelled");
  }
  const { data, error } = await userClient(token).rpc("complete_repull_connect_attempt", {
    p_state_digest: state,
    p_account_id: accountId,
    p_host_id: hostId,
  });
  if (error) {
    throw new RepullError("invalid", error.message);
  }
  if (!isRecord(data) || typeof data.connectionId !== "string") {
    throw new RepullError("retryable", "connect finish failed");
  }
  try {
    await cacheListings(data.connectionId, await fetchListings());
  } catch {
    // Mapping can refresh the remote set later; the connection itself is already stored.
  }
  return jsonResponse({
    connectionId: data.connectionId,
    returnTo: typeof data.returnTo === "string" ? data.returnTo : "/host/listings",
    requestedBy: hostSub,
  });
}

async function handleMappingModel(body: Record<string, unknown>, token: string): Promise<Response> {
  const connectionId = asText(body.connectionId);
  if (!connectionId) {
    throw new RepullError("invalid", "connection required");
  }
  await cacheListings(connectionId, await fetchListings());
  const { data, error } = await userClient(token).rpc("repull_mapping_model", {
    p_connection_id: connectionId,
  });
  if (error) {
    throw new RepullError("invalid", error.message);
  }
  return jsonResponse(data);
}

async function handleMapListing(body: Record<string, unknown>, token: string): Promise<Response> {
  const connectionId = asText(body.connectionId);
  const homeId = asText(body.homeId);
  const listing = isRecord(body.listing) ? body.listing : {};
  const listingId = asText(listing.listingId);
  const platform = asText(listing.platform) || "airbnb";
  if (!connectionId || !homeId || !listingId) {
    throw new RepullError("invalid", "mapping required");
  }
  await cacheListings(connectionId, await fetchListings());
  const { data, error } = await userClient(token).rpc("map_repull_listing", {
    p_connection_id: connectionId,
    p_platform: platform,
    p_listing_id: listingId,
    p_home_id: homeId,
  });
  if (error) {
    throw new RepullError("invalid", error.message);
  }
  await reconcileListing(listingId);
  const { data: model, error: modelError } = await userClient(token).rpc("repull_mapping_model", {
    p_connection_id: connectionId,
  });
  if (modelError) {
    throw new RepullError("invalid", modelError.message);
  }
  const listings = isRecord(model) && Array.isArray(model.listings) ? model.listings : [];
  const mapped = listings.find((row) => isRecord(row) && row.listingId === listingId);
  return jsonResponse(isRecord(mapped) ? mapped.status : data);
}

export async function handleRepullConnect(request: Request): Promise<Response> {
  if (request.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  if (request.method !== "POST") {
    return jsonResponse({ error: "method not allowed" }, 405);
  }
  try {
    const identity = await requireClerkUser(request);
    const body = (await request.json()) as Record<string, unknown>;
    const action = asText(body.action);
    switch (action) {
      case "start":
        return await handleStart(body, identity.token);
      case "finish":
        return await handleFinish(body, identity.token, identity.sub);
      case "mappingModel":
        return await handleMappingModel(body, identity.token);
      case "mapListing":
        return await handleMapListing(body, identity.token);
      default:
        return jsonResponse({ error: "unknown action" }, 400);
    }
  } catch (error) {
    if (error instanceof RepullError) {
      const status = error.kind === "retryable" ? 503 : error.kind === "untrusted" ? 401 : 400;
      return jsonResponse({ error: error.message }, status);
    }
    const message = error instanceof Error ? error.message : "connect failed";
    const status = message.includes("signed in") ? 401 : 400;
    return jsonResponse({ error: message }, status);
  }
}
