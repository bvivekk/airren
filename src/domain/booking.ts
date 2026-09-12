export const BOOKING_STATUSES = ["pending_payment", "confirmed", "failed", "expired", "canceled"] as const;

export type BookingStatus = (typeof BOOKING_STATUSES)[number];

export const CANCEL_ACTORS = ["guest", "host"] as const;

export type CancelActor = (typeof CANCEL_ACTORS)[number];

export type Booking = {
  id: string;
  homeId: string;
  homeName: string;
  homeSlug: string;
  guestId: string;
  checkIn: string;
  checkOut: string;
  guests: number;
  nights: number;
  subtotalPaise: number;
  totalPaise: number;
  razorpayOrderId: string | null;
  expiresAt: string | null;
  status: BookingStatus;
  canceledAt: string | null;
  canceledBy: CancelActor | null;
  createdAt: string;
};
