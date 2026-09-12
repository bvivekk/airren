import type { HostEarning, HostPayoutAccount, PayoutMethod, PayoutStatus } from "@/domain/payout";
import type { SupabaseClient } from "@supabase/supabase-js";

type EarningRow = {
  booking_id: string;
  home_name: string;
  check_in: string;
  check_out: string;
  nights: number;
  subtotal_paise: number;
  commission_paise: number;
  host_net_paise: number;
  payout_status: string;
  eligible_at: string;
  paid_at: string | null;
};

type AccountRow = {
  method: string;
  label: string;
  updated_at: string;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function asString(value: unknown, field: string): string {
  if (typeof value !== "string" || value.length === 0) {
    throw new Error(`earning ${field} must be a string`);
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
  throw new Error(`earning ${field} must be a number`);
}

function parsePayoutStatus(value: string): PayoutStatus {
  switch (value) {
    case "scheduled":
    case "on_hold":
    case "processing":
    case "paid":
    case "failed":
    case "canceled":
      return value;
    default:
      throw new Error(`unknown payout status: ${value}`);
  }
}

function parsePayoutMethod(value: string): PayoutMethod {
  switch (value) {
    case "bank_account":
    case "vpa":
      return value;
    default:
      throw new Error(`unknown payout method: ${value}`);
  }
}

export function parseHostEarning(row: unknown): HostEarning {
  if (!isRecord(row)) {
    throw new Error("earning row must be an object");
  }
  return {
    bookingId: asString(row.booking_id, "booking_id"),
    homeName: asString(row.home_name, "home_name"),
    checkIn: asString(row.check_in, "check_in"),
    checkOut: asString(row.check_out, "check_out"),
    nights: asNumber(row.nights, "nights"),
    subtotalPaise: asNumber(row.subtotal_paise, "subtotal_paise"),
    commissionPaise: asNumber(row.commission_paise, "commission_paise"),
    hostNetPaise: asNumber(row.host_net_paise, "host_net_paise"),
    payoutStatus: parsePayoutStatus(asString(row.payout_status, "payout_status")),
    eligibleAt: asString(row.eligible_at, "eligible_at"),
    paidAt: asNullableString(row.paid_at, "paid_at"),
  };
}

export function parseHostPayoutAccount(row: unknown): HostPayoutAccount {
  if (!isRecord(row)) {
    throw new Error("payout account must be an object");
  }
  return {
    method: parsePayoutMethod(asString(row.method, "method")),
    label: asString(row.label, "label"),
    updatedAt: asString(row.updated_at, "updated_at"),
  };
}

export async function listHostEarnings(client: SupabaseClient): Promise<HostEarning[]> {
  const { data, error } = await client.rpc("list_host_earnings");
  if (error) {
    throw new Error(error.message);
  }
  return ((data ?? []) as EarningRow[]).map(parseHostEarning);
}

export async function getMyPayoutAccount(client: SupabaseClient): Promise<HostPayoutAccount | null> {
  const { data, error } = await client
    .from("host_payout_accounts")
    .select("method, label, updated_at")
    .maybeSingle();
  if (error) {
    throw new Error(error.message);
  }
  if (!data) {
    return null;
  }
  return parseHostPayoutAccount(data as AccountRow);
}

export function payoutStatusLabel(status: PayoutStatus): string {
  switch (status) {
    case "scheduled":
      return "Scheduled";
    case "on_hold":
      return "On hold";
    case "processing":
      return "Processing";
    case "paid":
      return "Paid";
    case "failed":
      return "Failed";
    case "canceled":
      return "Canceled";
    default: {
      const _never: never = status;
      return _never;
    }
  }
}
