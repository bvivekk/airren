import type { SupabaseClient } from "@supabase/supabase-js";
import {
  calendarsFrom,
  isoDate,
  stay,
  stayOf,
  type CalendarEntry,
  type CalendarSet,
  type HomeId,
  type OccupancyFailure,
  type OccupancyId,
  type OccupancyResult,
  type OccupancySource,
  type Stay,
} from "../domain/occupancy.ts";
import { todayIso } from "./dates.ts";

export const BOOKING_WINDOW_NIGHTS = 400;

export function bookingWindow(): Stay {
  const from = isoDate(todayIso());
  if (!from) {
    throw new Error("today is not an ISO date");
  }
  return stayOf(from, BOOKING_WINDOW_NIGHTS);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function parseNights(from: unknown, to: unknown): Stay {
  const nights = typeof from === "string" && typeof to === "string" ? stay(from, to) : null;
  if (!nights) {
    throw new Error("occupancy row must hold a valid night range");
  }
  return nights;
}

function parseBusyRange(value: unknown): { homeId: HomeId; stay: Stay } {
  if (!isRecord(value) || typeof value.home_id !== "string") {
    throw new Error("busy stay must have a home_id");
  }
  return { homeId: value.home_id, stay: parseNights(value.check_in, value.check_out) };
}

function parseSource(value: unknown): OccupancySource {
  switch (value) {
    case "airren":
    case "host":
    case "external":
      return value;
    default:
      throw new Error(`unknown occupancy source: ${String(value)}`);
  }
}

function parseCalendarEntry(value: unknown): CalendarEntry {
  if (!isRecord(value)) {
    throw new Error("calendar entry must be an object");
  }
  if (typeof value.id !== "string" || value.id.length === 0) {
    throw new Error("calendar entry id must be a string");
  }
  if (value.label !== null && typeof value.label !== "string") {
    throw new Error("calendar entry label must be a string or null");
  }
  if (typeof value.removable !== "boolean") {
    throw new Error("calendar entry removable must be a boolean");
  }
  return {
    id: value.id,
    stay: parseNights(value.checkIn, value.checkOut),
    source: parseSource(value.source),
    label: value.label,
    removable: value.removable,
  };
}

export function parseListingCalendar(value: unknown): CalendarEntry[] {
  if (!isRecord(value) || !Array.isArray(value.entries)) {
    throw new Error("listing calendar must have entries");
  }
  return value.entries.map(parseCalendarEntry);
}

type RpcError = { code?: string; message?: string };

export function occupancyFailure(error: RpcError): OccupancyFailure | null {
  if (error.code === "23P01") {
    return "conflict";
  }
  if (error.code === "42501") {
    return "airren-stay";
  }
  if (error.message === "listing not found") {
    return "not-yours";
  }
  if (error.message === "check-out must be after check-in") {
    return "invalid-dates";
  }
  return null;
}

export async function loadCalendars(
  client: SupabaseClient,
  window: Stay,
  homeId?: HomeId,
): Promise<CalendarSet> {
  const params: { p_from: string; p_to: string; p_home_id?: string } = {
    p_from: window.from,
    p_to: window.to,
  };
  if (homeId !== undefined) {
    params.p_home_id = homeId;
  }
  const { data, error } = await client.rpc("busy_stays", params);
  if (error) {
    throw new Error(error.message);
  }
  const rows: unknown[] = Array.isArray(data) ? data : [];
  return calendarsFrom(rows.map(parseBusyRange), window);
}

export async function loadListingCalendar(
  client: SupabaseClient,
  listingId: HomeId,
  window: Stay,
): Promise<CalendarEntry[]> {
  const { data, error } = await client.rpc("listing_calendar", {
    p_listing_id: listingId,
    p_from: window.from,
    p_to: window.to,
  });
  if (error) {
    throw new Error(error.message || "listing calendar request failed");
  }
  return parseListingCalendar(data);
}

async function hostCalendarRpc(
  client: SupabaseClient,
  fn: "record_host_occupancy" | "release_host_occupancy" | "reschedule_host_occupancy",
  args: Record<string, string | null>,
): Promise<OccupancyResult<CalendarEntry[]>> {
  const { data, error } = await client.rpc(fn, args);
  if (error) {
    const reason = occupancyFailure(error);
    if (reason) {
      return { ok: false, reason };
    }
    throw new Error(error.message || "occupancy request failed");
  }
  return { ok: true, value: parseListingCalendar(data) };
}

export async function recordHostOccupancy(
  client: SupabaseClient,
  listingId: HomeId,
  nights: Stay,
  options?: { label?: string; externalRef?: string },
): Promise<OccupancyResult<CalendarEntry[]>> {
  return hostCalendarRpc(client, "record_host_occupancy", {
    p_listing_id: listingId,
    p_check_in: nights.from,
    p_check_out: nights.to,
    p_label: options?.label ?? null,
    p_external_ref: options?.externalRef ?? null,
  });
}

export async function releaseHostOccupancy(
  client: SupabaseClient,
  id: OccupancyId,
): Promise<OccupancyResult<CalendarEntry[]>> {
  return hostCalendarRpc(client, "release_host_occupancy", { p_occupancy_id: id });
}

export async function rescheduleHostOccupancy(
  client: SupabaseClient,
  id: OccupancyId,
  nights: Stay,
): Promise<OccupancyResult<CalendarEntry[]>> {
  return hostCalendarRpc(client, "reschedule_host_occupancy", {
    p_occupancy_id: id,
    p_check_in: nights.from,
    p_check_out: nights.to,
  });
}
