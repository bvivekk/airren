import type { Booking, CancelActor } from "./booking.ts";
import { hostEarningsFor } from "../lib/pricing.ts";

export const CANCELLATION_POLICIES = ["flexible", "strict"] as const;
export type CancellationPolicy = (typeof CANCELLATION_POLICIES)[number];

export const PLATFORM_DEFAULT_POLICY: CancellationPolicy = "flexible";

export const REFUND_BANDS = ["full", "half", "none"] as const;
export type RefundBand = (typeof REFUND_BANDS)[number];

export const REFUND_STATUSES = ["requested", "processing", "processed", "failed"] as const;
export type RefundStatus = (typeof REFUND_STATUSES)[number];

/** Airbnb default check-in clock, same zone as payout eligibility. */
export const CHECK_IN_HOUR_IST = 15;

export type RefundQuote = {
  policy: CancellationPolicy;
  band: RefundBand;
  refundPaise: number;
  keptPaise: number;
  commissionAfterPaise: number;
  hostNetAfterPaise: number;
};

export type Refund = {
  id: string;
  bookingId: string;
  amountPaise: number;
  status: RefundStatus;
  actor: CancelActor;
  policyApplied: CancellationPolicy | "host_full";
  razorpayRefundId: string | null;
};

export type Trip = {
  booking: Booking;
  policy: CancellationPolicy;
  refund: Refund | null;
};

export type CancelStayResult = {
  bookingId: string;
  status: "canceled";
  alreadyCanceled: boolean;
  quote: RefundQuote;
  refund: Refund | null;
  payout:
    | { action: "canceled" }
    | { action: "amount_updated"; amountPaise: number }
    | { action: "unchanged"; amountPaise: number }
    | { action: "none" };
};

export type CancelStayError =
  | { code: "not_found" }
  | { code: "forbidden" }
  | { code: "not_confirmed" }
  | { code: "window_closed" }
  | { code: "payout_in_flight" }
  | { code: "no_payment" };

export function checkInInstant(checkIn: string): Date {
  return new Date(`${checkIn}T${String(CHECK_IN_HOUR_IST).padStart(2, "0")}:00:00+05:30`);
}

export function resolvePolicy(listingPolicy: CancellationPolicy | null): CancellationPolicy {
  return listingPolicy ?? PLATFORM_DEFAULT_POLICY;
}

export function canGuestCancel(now: Date, checkIn: string): boolean {
  return now.getTime() < checkInInstant(checkIn).getTime();
}

export function policyBand(policy: CancellationPolicy, now: Date, checkInAt: Date): RefundBand {
  const hoursUntil = (checkInAt.getTime() - now.getTime()) / 3_600_000;
  switch (policy) {
    case "flexible":
      return hoursUntil >= 24 ? "full" : "none";
    case "strict":
      return hoursUntil >= 14 * 24 ? "half" : "none";
    default: {
      const _never: never = policy;
      return _never;
    }
  }
}

function quoteFromBand(
  policy: CancellationPolicy,
  band: RefundBand,
  totalPaise: number,
): RefundQuote {
  let refundBps = 0;
  switch (band) {
    case "full":
      refundBps = 10_000;
      break;
    case "half":
      refundBps = 5_000;
      break;
    case "none":
      refundBps = 0;
      break;
    default: {
      const _never: never = band;
      return _never;
    }
  }
  const refundPaise = Math.round((totalPaise * refundBps) / 10_000);
  const keptPaise = totalPaise - refundPaise;
  const earnings = hostEarningsFor(keptPaise);
  return {
    policy,
    band,
    refundPaise,
    keptPaise,
    commissionAfterPaise: earnings.commissionPaise,
    hostNetAfterPaise: earnings.hostNetPaise,
  };
}

export function quoteRefund(
  policy: CancellationPolicy,
  now: Date,
  checkIn: string,
  totalPaise: number,
): RefundQuote {
  return quoteFromBand(policy, policyBand(policy, now, checkInInstant(checkIn)), totalPaise);
}

export function quoteHostRefund(policy: CancellationPolicy, totalPaise: number): RefundQuote {
  return quoteFromBand(policy, "full", totalPaise);
}
