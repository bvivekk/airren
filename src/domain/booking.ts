export const BOOKING_STATUSES = ["pending_payment", "confirmed", "failed", "expired"] as const;

export type BookingStatus = (typeof BOOKING_STATUSES)[number];

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
  createdAt: string;
};
