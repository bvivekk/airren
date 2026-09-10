import { createClient } from "npm:@supabase/supabase-js@2";
import type { RepullOccupancyCommand } from "./command.ts";
import { RepullError } from "./errors.ts";

export type TerminalProjectionOutcome =
  | { readonly kind: "applied"; readonly occupancyId: string }
  | { readonly kind: "cancelled" }
  | { readonly kind: "needs_mapping" }
  | { readonly kind: "conflict" };

export type ProjectionOutcome =
  | TerminalProjectionOutcome
  | { readonly kind: "duplicate"; readonly original: TerminalProjectionOutcome };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function parseTerminal(value: unknown): TerminalProjectionOutcome {
  if (!isRecord(value) || typeof value.kind !== "string") {
    throw new RepullError("retryable", "unexpected projector result");
  }
  switch (value.kind) {
    case "applied":
      return { kind: "applied", occupancyId: typeof value.occupancyId === "string" ? value.occupancyId : "" };
    case "cancelled":
      return { kind: "cancelled" };
    case "needs_mapping":
      return { kind: "needs_mapping" };
    case "conflict":
      return { kind: "conflict" };
    default:
      throw new RepullError("retryable", "unexpected projector result");
  }
}

function parseOutcome(value: unknown): ProjectionOutcome {
  if (!isRecord(value) || typeof value.kind !== "string") {
    throw new RepullError("retryable", "unexpected projector result");
  }
  if (value.kind === "duplicate") {
    return { kind: "duplicate", original: parseTerminal(value.original) };
  }
  return parseTerminal(value);
}

export async function project(command: RepullOccupancyCommand): Promise<ProjectionOutcome> {
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceKey) {
    throw new RepullError("retryable", "supabase is not configured");
  }
  const admin = createClient(supabaseUrl, serviceKey);
  const { data, error } = await admin.rpc("process_repull_occupancy_event", {
    p_event_id: command.eventId,
    p_event_type: command.eventType,
    p_kind: command.kind,
    p_platform: command.platform,
    p_listing_id: command.listingId,
    p_reservation_id: command.reservationId,
    p_check_in: command.kind === "upsert" ? command.stay.from : null,
    p_check_out: command.kind === "upsert" ? command.stay.to : null,
    p_label: command.kind === "upsert" ? command.label : null,
    p_observed_at: command.observedAt,
    p_payload_digest: command.payloadDigest,
  });
  if (error) {
    throw new RepullError("retryable", error.message);
  }
  return parseOutcome(data);
}
