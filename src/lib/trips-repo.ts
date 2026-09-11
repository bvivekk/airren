import type { Booking } from "../domain/booking.ts";
import {
  PLATFORM_DEFAULT_POLICY,
  type CancellationPolicy,
  type Refund,
  type RefundStatus,
  type Trip,
} from "../domain/refund.ts";
import type { SupabaseClient } from "@supabase/supabase-js";
import { parseBooking } from "./bookings-repo.ts";

const TRIP_SELECT = `
  id,
  home_id,
  guest_id,
  check_in,
  check_out,
  guests,
  nights,
  subtotal_paise,
  total_paise,
  razorpay_order_id,
  expires_at,
  status,
  canceled_at,
  canceled_by,
  created_at,
  homes ( name, slug, cancellation_policy ),
  refunds ( id, booking_id, amount_paise, status, actor, policy_applied, razorpay_refund_id )
`;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function asString(value: unknown, field: string): string {
  if (typeof value !== "string" || value.length === 0) {
    throw new Error(`trip ${field} must be a string`);
  }
  return value;
}

function asNullableString(value: unknown, field: string): string | null {
  if (value === null) {
    return null;
  }
  return asString(value, field);
}

function asNumber(value: unknown, field: string): number {
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  throw new Error(`trip ${field} must be a number`);
}

function parsePolicy(value: unknown): CancellationPolicy {
  if (value === null || value === undefined) {
    return PLATFORM_DEFAULT_POLICY;
  }
  if (value === "flexible" || value === "strict") {
    return value;
  }
  throw new Error("trip cancellation_policy must be flexible or strict");
}

function parseRefundStatus(value: string): RefundStatus {
  switch (value) {
    case "requested":
    case "processing":
    case "processed":
    case "failed":
      return value;
    default:
      throw new Error(`unknown refund status: ${value}`);
  }
}

function parseRefundActor(value: string): Refund["actor"] {
  if (value === "guest" || value === "host") {
    return value;
  }
  throw new Error("refund actor must be guest or host");
}

function parsePolicyApplied(value: string): Refund["policyApplied"] {
  if (value === "flexible" || value === "strict" || value === "host_full") {
    return value;
  }
  throw new Error("refund policy_applied is invalid");
}

function parseRefund(row: unknown): Refund {
  if (!isRecord(row)) {
    throw new Error("refund row must be an object");
  }
  return {
    id: asString(row.id, "id"),
    bookingId: asString(row.booking_id, "booking_id"),
    amountPaise: asNumber(row.amount_paise, "amount_paise"),
    status: parseRefundStatus(asString(row.status, "status")),
    actor: parseRefundActor(asString(row.actor, "actor")),
    policyApplied: parsePolicyApplied(asString(row.policy_applied, "policy_applied")),
    razorpayRefundId: asNullableString(row.razorpay_refund_id, "razorpay_refund_id"),
  };
}

function firstEmbed(value: unknown): unknown {
  return Array.isArray(value) ? value[0] : value;
}

export function parseTrip(row: unknown): Trip {
  if (!isRecord(row)) {
    throw new Error("trip row must be an object");
  }
  const home = firstEmbed(row.homes);
  if (!isRecord(home)) {
    throw new Error("trip home must be an object");
  }
  const booking: Booking = parseBooking({
    ...row,
    homes: { name: home.name, slug: home.slug },
  });
  const refundEmbed = firstEmbed(row.refunds);
  return {
    booking,
    policy: parsePolicy(home.cancellation_policy ?? null),
    refund: refundEmbed == null ? null : parseRefund(refundEmbed),
  };
}

export async function getTripById(client: SupabaseClient, id: string): Promise<Trip | undefined> {
  const { data, error } = await client.from("bookings").select(TRIP_SELECT).eq("id", id).maybeSingle();
  if (error) {
    if (error.code === "22P02" || error.message.includes("invalid input syntax")) {
      return undefined;
    }
    throw new Error(error.message);
  }
  if (!data) {
    return undefined;
  }
  return parseTrip(data);
}
