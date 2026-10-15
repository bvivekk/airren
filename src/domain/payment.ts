export const PAYMENT_PROVIDERS = ["razorpay", "stripe"] as const;

export type PaymentProviderId = (typeof PAYMENT_PROVIDERS)[number];

export const PAYMENT_STATUSES = ["captured", "failed", "refunded"] as const;

export type PaymentStatus = (typeof PAYMENT_STATUSES)[number];

export type Payment = {
  id: string;
  bookingId: string;
  guestId: string;
  provider: PaymentProviderId;
  orderId: string;
  paymentId: string | null;
  amountPaise: number;
  currency: string;
  status: PaymentStatus;
  createdAt: string;
  updatedAt: string;
};

export function paymentStatusRank(status: PaymentStatus): number {
  switch (status) {
    case "captured":
      return 0;
    case "refunded":
      return 1;
    case "failed":
      return 2;
    default: {
      const _never: never = status;
      return _never;
    }
  }
}

export function paymentStatusLabel(status: PaymentStatus): string {
  switch (status) {
    case "captured":
      return "Paid";
    case "failed":
      return "Failed";
    case "refunded":
      return "Refunded";
    default: {
      const _never: never = status;
      return _never;
    }
  }
}

export function paymentProviderLabel(provider: PaymentProviderId): string {
  switch (provider) {
    case "razorpay":
      return "Razorpay";
    case "stripe":
      return "Stripe";
    default: {
      const _never: never = provider;
      return _never;
    }
  }
}

export function pickDisplayPayment(payments: Payment[]): Payment | null {
  if (payments.length === 0) {
    return null;
  }
  return [...payments].sort((left, right) => {
    const rank = paymentStatusRank(left.status) - paymentStatusRank(right.status);
    if (rank !== 0) {
      return rank;
    }
    return right.createdAt.localeCompare(left.createdAt);
  })[0];
}
