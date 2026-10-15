import { paymentStatusRank, type Payment, type PaymentProviderId, type PaymentStatus } from "../domain/payment.ts";
import type { SupabaseClient } from "@supabase/supabase-js";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function asString(value: unknown, field: string): string {
  if (typeof value !== "string" || value.length === 0) {
    throw new Error(`payment ${field} must be a string`);
  }
  return value;
}

function asNullableString(value: unknown): string | null {
  if (typeof value !== "string" || value.length === 0) {
    return null;
  }
  return value;
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
  throw new Error(`payment ${field} must be a number`);
}

function parseProvider(value: string): PaymentProviderId {
  switch (value) {
    case "razorpay":
    case "stripe":
      return value;
    default:
      throw new Error(`unknown payment provider: ${value}`);
  }
}

export function parsePaymentStatus(value: string): PaymentStatus | null {
  switch (value) {
    case "captured":
    case "failed":
    case "refunded":
      return value;
    default:
      return null;
  }
}

function assertStatus(value: string): PaymentStatus {
  const status = parsePaymentStatus(value);
  if (!status) {
    throw new Error(`unknown payment status: ${value}`);
  }
  return status;
}

export function parsePayment(row: unknown): Payment {
  if (!isRecord(row)) {
    throw new Error("payment row must be an object");
  }
  const orderId = asNullableString(row.provider_order_id) ?? asNullableString(row.razorpay_order_id);
  if (!orderId) {
    throw new Error("payment order id is missing");
  }
  const provider = parseProvider(asString(row.provider ?? "razorpay", "provider"));
  return {
    id: asString(row.id, "id"),
    bookingId: asString(row.booking_id, "booking_id"),
    guestId: asString(row.guest_id, "guest_id"),
    provider,
    orderId,
    paymentId: asNullableString(row.provider_payment_id) ?? asNullableString(row.razorpay_payment_id),
    amountPaise: asNumber(row.amount_paise, "amount_paise"),
    currency: asString(row.currency, "currency"),
    status: assertStatus(asString(row.status, "status")),
    createdAt: asString(row.created_at, "created_at"),
    updatedAt: asString(row.updated_at ?? row.created_at, "updated_at"),
  };
}

export function parsePayments(value: unknown): Payment[] {
  if (value == null) {
    return [];
  }
  const rows = Array.isArray(value) ? value : [value];
  return rows.map(parsePayment);
}

export type GuestPaymentSnapshot = {
  bookingId: string;
  status: PaymentStatus;
  amountPaise: number;
  currency: string;
};

export async function listGuestPaymentSnapshots(
  client: SupabaseClient,
  bookingIds: string[],
): Promise<GuestPaymentSnapshot[]> {
  if (bookingIds.length === 0) {
    return [];
  }
  const { data, error } = await client
    .from("payments")
    .select("booking_id, status, amount_paise, currency, created_at")
    .in("booking_id", bookingIds);
  if (error) {
    console.error("host payments", error.message);
    return [];
  }
  const grouped = new Map<string, Array<GuestPaymentSnapshot & { createdAt: string }>>();
  for (const row of data ?? []) {
    if (!isRecord(row)) {
      continue;
    }
    const status = parsePaymentStatus(asString(row.status, "status"));
    if (!status) {
      continue;
    }
    const snapshot = {
      bookingId: asString(row.booking_id, "booking_id"),
      status,
      amountPaise: asNumber(row.amount_paise, "amount_paise"),
      currency: asString(row.currency ?? "INR", "currency"),
      createdAt: asString(row.created_at, "created_at"),
    };
    const existing = grouped.get(snapshot.bookingId) ?? [];
    existing.push(snapshot);
    grouped.set(snapshot.bookingId, existing);
  }
  const picked: GuestPaymentSnapshot[] = [];
  for (const rows of grouped.values()) {
    const best = [...rows].sort((left, right) => {
      const rank = paymentStatusRank(left.status) - paymentStatusRank(right.status);
      if (rank !== 0) {
        return rank;
      }
      return right.createdAt.localeCompare(left.createdAt);
    })[0];
    if (best) {
      picked.push({
        bookingId: best.bookingId,
        status: best.status,
        amountPaise: best.amountPaise,
        currency: best.currency,
      });
    }
  }
  return picked;
}
