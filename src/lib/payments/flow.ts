import type { Booking } from "../../domain/booking.ts";
import { isIsoDate } from "../dates.ts";
import { serverStayCharge } from "./amount.ts";
import type { PaymentGateway } from "./types.ts";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const PAYMENT_FLOW_CODES = [
  "invalid_dates",
  "invalid_guests",
  "forbidden",
  "unauthenticated",
  "conflict",
  "hold_expired",
  "not_pending",
  "bad_signature",
  "not_captured",
  "amount_rejected",
  "amount_mismatch",
  "unavailable",
] as const;

export type PaymentFlowCode = (typeof PAYMENT_FLOW_CODES)[number];

export class PaymentFlowError extends Error {
  readonly code: PaymentFlowCode;

  constructor(code: PaymentFlowCode, message: string) {
    super(message);
    this.name = "PaymentFlowError";
    this.code = code;
  }
}

export function paymentFlowStatus(code: PaymentFlowCode): number {
  switch (code) {
    case "invalid_dates":
    case "invalid_guests":
    case "bad_signature":
      return 400;
    case "unauthenticated":
      return 401;
    case "forbidden":
      return 403;
    case "unavailable":
      return 404;
    case "not_captured":
      return 402;
    case "conflict":
    case "hold_expired":
    case "not_pending":
    case "amount_rejected":
    case "amount_mismatch":
      return 409;
    default: {
      const _never: never = code;
      return _never;
    }
  }
}

export type CheckoutCommand =
  | { kind: "resume"; bookingId: string }
  | { kind: "create"; homeId: string; checkIn: string; checkOut: string; guests: number };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function readCheckoutCommand(body: unknown): CheckoutCommand | null {
  if (!isRecord(body)) {
    return null;
  }
  if (typeof body.bookingId === "string") {
    return UUID.test(body.bookingId) ? { kind: "resume", bookingId: body.bookingId } : null;
  }
  if (typeof body.homeId !== "string" || !UUID.test(body.homeId)) {
    return null;
  }
  if (typeof body.checkIn !== "string" || typeof body.checkOut !== "string") {
    return null;
  }
  if (!isIsoDate(body.checkIn) || !isIsoDate(body.checkOut)) {
    return null;
  }
  if (typeof body.guests !== "number" || !Number.isInteger(body.guests)) {
    return null;
  }
  return {
    kind: "create",
    homeId: body.homeId,
    checkIn: body.checkIn,
    checkOut: body.checkOut,
    guests: body.guests,
  };
}

export type VerifyCommand = {
  bookingId: string;
  orderId: string;
  paymentId: string;
  signature: string;
};

export function readVerifyCommand(body: unknown): VerifyCommand | null {
  if (!isRecord(body)) {
    return null;
  }
  if (typeof body.bookingId !== "string" || !UUID.test(body.bookingId)) {
    return null;
  }
  if (typeof body.razorpayOrderId !== "string" || body.razorpayOrderId.length === 0) {
    return null;
  }
  if (typeof body.razorpayPaymentId !== "string" || body.razorpayPaymentId.length === 0) {
    return null;
  }
  if (typeof body.razorpaySignature !== "string" || body.razorpaySignature.length === 0) {
    return null;
  }
  return {
    bookingId: body.bookingId,
    orderId: body.razorpayOrderId,
    paymentId: body.razorpayPaymentId,
    signature: body.razorpaySignature,
  };
}

export type StayCheckoutSession = {
  bookingId: string;
  razorpayOrderId: string;
  amountPaise: number;
  currency: "INR";
  keyId: string;
};

function stayReceipt(): string {
  return `stay_${crypto.randomUUID().replaceAll("-", "").slice(0, 20)}`;
}

export async function startStayCheckout(args: {
  home: { id: string; nightlyRatePaise: number; maxGuests: number };
  checkIn: string;
  checkOut: string;
  guests: number;
  gateway: PaymentGateway;
  createBooking: (input: {
    homeId: string;
    checkIn: string;
    checkOut: string;
    guests: number;
    orderId: string;
  }) => Promise<{ id: string; totalPaise: number }>;
}): Promise<StayCheckoutSession> {
  if (!Number.isInteger(args.guests) || args.guests < 1 || args.guests > args.home.maxGuests) {
    throw new PaymentFlowError("invalid_guests", "That guest count is not allowed for this home.");
  }
  const charge = serverStayCharge({
    nightlyRatePaise: args.home.nightlyRatePaise,
    checkIn: args.checkIn,
    checkOut: args.checkOut,
  });
  if (!charge) {
    throw new PaymentFlowError("invalid_dates", "Check-out must be after check-in.");
  }
  const order = await args.gateway.createOrder({
    amountPaise: charge.totalPaise,
    currency: "INR",
    receipt: stayReceipt(),
    notes: {
      home_id: args.home.id,
      check_in: args.checkIn,
      check_out: args.checkOut,
    },
  });
  if (order.amountPaise !== charge.totalPaise || order.currency !== "INR") {
    throw new PaymentFlowError("amount_mismatch", "Could not start checkout.");
  }
  const booking = await args.createBooking({
    homeId: args.home.id,
    checkIn: args.checkIn,
    checkOut: args.checkOut,
    guests: args.guests,
    orderId: order.id,
  });
  if (booking.totalPaise !== charge.totalPaise) {
    throw new PaymentFlowError("amount_mismatch", "Could not start checkout.");
  }
  return {
    bookingId: booking.id,
    razorpayOrderId: order.id,
    amountPaise: booking.totalPaise,
    currency: "INR",
    keyId: args.gateway.checkoutKeyId,
  };
}

export function resumeStayCheckout(args: {
  booking: Booking;
  userId: string;
  keyId: string;
  now?: Date;
}): StayCheckoutSession {
  if (args.booking.guestId !== args.userId) {
    throw new PaymentFlowError("forbidden", "You cannot pay for this stay.");
  }
  if (args.booking.status !== "pending_payment" || !args.booking.razorpayOrderId) {
    throw new PaymentFlowError("not_pending", "This stay can no longer be paid.");
  }
  const now = args.now ?? new Date();
  if (args.booking.expiresAt && Date.parse(args.booking.expiresAt) <= now.getTime()) {
    throw new PaymentFlowError("hold_expired", "This hold has expired. Start a new reserve.");
  }
  return {
    bookingId: args.booking.id,
    razorpayOrderId: args.booking.razorpayOrderId,
    amountPaise: args.booking.totalPaise,
    currency: "INR",
    keyId: args.keyId,
  };
}

export async function verifyStayPayment(args: {
  booking: Booking;
  userId: string;
  orderId: string;
  paymentId: string;
  signature: string;
  gateway: PaymentGateway;
  confirm: (amountPaise: number) => Promise<void>;
}): Promise<void> {
  if (args.booking.guestId !== args.userId) {
    throw new PaymentFlowError("forbidden", "You cannot pay for this stay.");
  }
  if (args.booking.status !== "pending_payment" && args.booking.status !== "confirmed") {
    throw new PaymentFlowError("not_pending", "This stay can no longer be paid.");
  }
  if (args.booking.razorpayOrderId !== args.orderId) {
    throw new PaymentFlowError("bad_signature", "Payment does not match this stay.");
  }
  if (!args.gateway.verifyCheckoutSignature(args.orderId, args.paymentId, args.signature)) {
    throw new PaymentFlowError("bad_signature", "Payment could not be verified.");
  }
  const payment = await args.gateway.fetchPayment(args.paymentId);
  if (payment.orderId !== args.orderId || payment.currency !== "INR" || payment.amountPaise !== args.booking.totalPaise) {
    throw new PaymentFlowError("amount_rejected", "Payment amount does not match this stay.");
  }
  if (payment.status !== "captured" && payment.status !== "authorized") {
    throw new PaymentFlowError("not_captured", "Payment was not captured.");
  }
  if (args.booking.status === "pending_payment") {
    await args.confirm(args.booking.totalPaise);
  }
}

export type ClaimedRefund = {
  id: string;
  paymentId: string;
  amountPaise: number;
  receipt: string;
};

export async function submitClaimedRefund(args: {
  claimed: ClaimedRefund | null;
  gateway: PaymentGateway;
  recordSubmitted: (refundId: string, providerRefundId: string) => Promise<void>;
}): Promise<boolean> {
  if (!args.claimed) {
    return false;
  }
  if (!Number.isInteger(args.claimed.amountPaise) || args.claimed.amountPaise <= 0) {
    throw new PaymentFlowError("amount_rejected", "Refund amount is not valid.");
  }
  const refund = await args.gateway.createRefund({
    paymentId: args.claimed.paymentId,
    amountPaise: args.claimed.amountPaise,
    receipt: args.claimed.receipt,
    idempotencyKey: args.claimed.id,
  });
  await args.recordSubmitted(args.claimed.id, refund.id);
  return true;
}

export function mapBookingWriteError(error: { message: string; code?: string }): PaymentFlowError {
  const message = error.message.toLowerCase();
  if (error.code === "23P01" || message.includes("exclusion") || message.includes("overlap")) {
    return new PaymentFlowError("conflict", "Those dates are already reserved.");
  }
  if (message.includes("guest count")) {
    return new PaymentFlowError("invalid_guests", "That guest count is not allowed for this home.");
  }
  if (message.includes("home not found")) {
    return new PaymentFlowError("unavailable", "This home is not available.");
  }
  if (message.includes("check-out")) {
    return new PaymentFlowError("invalid_dates", "Check-out must be after check-in.");
  }
  if (message.includes("signed in")) {
    return new PaymentFlowError("unauthenticated", "Sign in to reserve.");
  }
  return new PaymentFlowError("conflict", "Could not start checkout.");
}
