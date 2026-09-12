export const PAYOUT_STATUSES = ["scheduled", "on_hold", "processing", "paid", "failed", "canceled"] as const;

export type PayoutStatus = (typeof PAYOUT_STATUSES)[number];

export const HOLD_REASONS = ["no_host", "no_destination", "manual"] as const;

export type HoldReason = (typeof HOLD_REASONS)[number];

export const PAYOUT_METHODS = ["bank_account", "vpa"] as const;

export type PayoutMethod = (typeof PAYOUT_METHODS)[number];

export type HostEarning = {
  bookingId: string;
  homeName: string;
  checkIn: string;
  checkOut: string;
  nights: number;
  subtotalPaise: number;
  commissionPaise: number;
  hostNetPaise: number;
  payoutStatus: PayoutStatus;
  eligibleAt: string;
  paidAt: string | null;
};

export type HostPayoutAccount = {
  method: PayoutMethod;
  label: string;
  updatedAt: string;
};

export type SavePayoutAccountRequest =
  | { method: "bank_account"; accountNumber: string; ifsc: string; accountHolderName: string }
  | { method: "vpa"; vpa: string };
