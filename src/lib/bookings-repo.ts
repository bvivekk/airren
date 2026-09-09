import type { Booking, BookingStatus } from "@/domain/booking";
import type { SupabaseClient } from "@supabase/supabase-js";

type HomeEmbed = {
  name: string;
  slug: string;
};

export type BookingRow = {
  id: string;
  home_id: string;
  guest_id: string;
  check_in: string;
  check_out: string;
  guests: number;
  nights: number;
  subtotal_paise: number;
  service_fee_paise: number;
  cleaning_fee_paise: number;
  total_paise: number;
  razorpay_order_id: string | null;
  expires_at: string | null;
  status: string;
  created_at: string;
  homes: HomeEmbed | HomeEmbed[] | null;
};

const BOOKING_SELECT = `
  id,
  home_id,
  guest_id,
  check_in,
  check_out,
  guests,
  nights,
  subtotal_paise,
  service_fee_paise,
  cleaning_fee_paise,
  total_paise,
  razorpay_order_id,
  expires_at,
  status,
  created_at,
  homes ( name, slug )
`;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function asString(value: unknown, field: string): string {
  if (typeof value !== "string" || value.length === 0) {
    throw new Error(`booking row ${field} must be a string`);
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
  throw new Error(`booking row ${field} must be a number`);
}

function parseStatus(value: string): BookingStatus {
  switch (value) {
    case "pending_payment":
    case "confirmed":
    case "failed":
    case "expired":
      return value;
    default:
      throw new Error(`unknown booking status: ${value}`);
  }
}

function parseHomeEmbed(value: unknown): HomeEmbed {
  const home = Array.isArray(value) ? value[0] : value;
  if (!isRecord(home)) {
    throw new Error("booking home must be an object");
  }
  return {
    name: asString(home.name, "homes.name"),
    slug: asString(home.slug, "homes.slug"),
  };
}

export function parseBooking(row: unknown): Booking {
  if (!isRecord(row)) {
    throw new Error("booking row must be an object");
  }
  const status = parseStatus(asString(row.status, "status"));
  const home = parseHomeEmbed(row.homes);
  return {
    id: asString(row.id, "id"),
    homeId: asString(row.home_id, "home_id"),
    homeName: home.name,
    homeSlug: home.slug,
    guestId: asString(row.guest_id, "guest_id"),
    checkIn: asString(row.check_in, "check_in"),
    checkOut: asString(row.check_out, "check_out"),
    guests: asNumber(row.guests, "guests"),
    nights: asNumber(row.nights, "nights"),
    subtotalPaise: asNumber(row.subtotal_paise, "subtotal_paise"),
    serviceFeePaise: asNumber(row.service_fee_paise, "service_fee_paise"),
    cleaningFeePaise: asNumber(row.cleaning_fee_paise, "cleaning_fee_paise"),
    totalPaise: asNumber(row.total_paise, "total_paise"),
    razorpayOrderId: asNullableString(row.razorpay_order_id, "razorpay_order_id"),
    expiresAt: asNullableString(row.expires_at, "expires_at"),
    status,
    createdAt: asString(row.created_at, "created_at"),
  };
}

export async function getBookingById(client: SupabaseClient, id: string): Promise<Booking | undefined> {
  const { data, error } = await client.from("bookings").select(BOOKING_SELECT).eq("id", id).maybeSingle();
  if (error) {
    if (error.code === "22P02" || error.message.includes("invalid input syntax")) {
      return undefined;
    }
    throw new Error(error.message);
  }
  if (!data) {
    return undefined;
  }
  return parseBooking(data);
}

export async function listMyBookings(client: SupabaseClient): Promise<Booking[]> {
  const { data, error } = await client.from("bookings").select(BOOKING_SELECT).order("created_at", { ascending: false });
  if (error) {
    throw new Error(error.message);
  }
  return (data ?? []).map(parseBooking);
}
