"use client";

import { useSession, useUser } from "@clerk/nextjs";
import Link from "next/link";
import { useEffect, useState } from "react";
import type { Booking } from "@/domain/booking";
import { paymentProviderLabel, paymentStatusLabel } from "@/domain/payment";
import type { RefundStatus, Trip } from "@/domain/refund";
import { canGuestCancel, quoteRefund } from "@/domain/refund";
import { clerkSupabaseJwtTemplate } from "@/lib/clerk-supabase";
import { formatInr } from "@/lib/money";
import { requestStayRefund, resumeStayPayment, verifyStayCheckout } from "@/lib/payments/checkout-client";
import { guestCheckoutContact } from "@/lib/phone";
import { openRazorpayCheckout } from "@/lib/razorpay-checkout";
import { useSupabaseClient } from "@/lib/supabase/browser";
import { getTripById } from "@/lib/trips-repo";

function holdOpen(booking: Booking, now: number): boolean {
  if (booking.status !== "pending_payment") {
    return false;
  }
  if (!booking.expiresAt) {
    return true;
  }
  return Date.parse(booking.expiresAt) > now;
}

function statusCopy(booking: Booking): { kicker: string; title: string; detail: string | null } {
  switch (booking.status) {
    case "pending_payment":
      return {
        kicker: "Waiting for payment",
        title: `Finish paying for ${booking.homeName}`,
        detail: "Pay in INR to confirm the stay. This page updates when Razorpay verifies the payment.",
      };
    case "confirmed":
      return {
        kicker: "Stay confirmed",
        title: `You are in at ${booking.homeName}`,
        detail: "Payment was captured. Your dates are locked.",
      };
    case "failed":
      return {
        kicker: "Payment failed",
        title: `We could not confirm ${booking.homeName}`,
        detail: "Those dates are free again if you want to retry.",
      };
    case "expired":
      return {
        kicker: "Hold expired",
        title: `The hold expired for ${booking.homeName}`,
        detail: "Start a new Reserve if you still want the home.",
      };
    case "canceled":
      return {
        kicker: "Stay canceled",
        title: `${booking.homeName} is no longer reserved`,
        detail: "Those dates are free again.",
      };
    default: {
      const _never: never = booking.status;
      return _never;
    }
  }
}

function refundStatusLabel(status: RefundStatus): string {
  switch (status) {
    case "requested":
    case "processing":
      return "on the way";
    case "processed":
      return "sent";
    case "failed":
      return "needs attention";
    default: {
      const _never: never = status;
      return _never;
    }
  }
}

async function cancelStayInvokeError(error: { message?: string; context?: Response }): Promise<string> {
  const context = error.context;
  if (context) {
    try {
      const body = (await context.json()) as { error?: string };
      if (typeof body.error === "string" && body.error.length > 0) {
        return body.error;
      }
    } catch {}
  }
  return error.message || "Could not cancel this stay.";
}

function cancelErrorCopy(message: string): string {
  switch (message) {
    case "window_closed":
      return "This stay can no longer be canceled.";
    case "payout_in_flight":
      return "The host payout is already moving. Contact support.";
    case "not_confirmed":
      return "Only a confirmed stay can be canceled.";
    case "forbidden":
      return "You cannot cancel this stay.";
    default:
      return message || "Could not cancel this stay.";
  }
}

export function BookingStatus({
  initial,
  paymentsEnabled,
  paymentResult,
}: {
  initial: Trip;
  paymentsEnabled: boolean;
  paymentResult: "success" | "failed" | null;
}) {
  const { session } = useSession();
  const { user } = useUser();
  const supabase = useSupabaseClient();
  const [trip, setTrip] = useState(initial);
  const [pending, setPending] = useState(false);
  const [paying, setPaying] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState(paymentResult);
  const booking = trip.booking;
  const now = new Date();
  const payable = paymentsEnabled && holdOpen(booking, now.getTime());
  const quote = quoteRefund(trip.policy, now, booking.checkIn, booking.totalPaise);
  const showCancel = booking.status === "confirmed" && canGuestCancel(now, booking.checkIn);

  useEffect(() => {
    if (booking.status !== "pending_payment") {
      return;
    }
    let cancelled = false;
    const tick = window.setInterval(() => {
      void getTripById(supabase, booking.id).then((next) => {
        if (!cancelled && next) {
          setTrip(next);
        }
      });
    }, 2000);
    return () => {
      cancelled = true;
      window.clearInterval(tick);
    };
  }, [booking.id, booking.status, supabase]);

  const cancelStay = async () => {
    setPending(true);
    setError("");
    const token = (await session?.getToken({ template: clerkSupabaseJwtTemplate })) ?? null;
    const { error: invokeError } = await supabase.functions.invoke("cancel-stay", {
      body: { bookingId: booking.id },
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (invokeError) {
      setPending(false);
      setError(cancelErrorCopy(await cancelStayInvokeError(invokeError)));
      return;
    }
    const next = await getTripById(supabase, booking.id);
    if (next) {
      setTrip(next);
    }
    if (next?.booking.status === "canceled") {
      try {
        await requestStayRefund(booking.id);
        const refreshed = await getTripById(supabase, booking.id);
        if (refreshed) {
          setTrip(refreshed);
        }
      } catch (refundError) {
        console.error("refund", refundError instanceof Error ? refundError.message : refundError);
      }
    }
    setPending(false);
  };

  const payStay = async () => {
    setPaying(true);
    setError("");
    setNotice(null);
    try {
      const stay = await resumeStayPayment(booking.id);
      let settled = false;
      const finish = async (result: "success" | "failed" | null) => {
        if (settled) {
          return;
        }
        settled = true;
        const next = await getTripById(supabase, booking.id);
        if (next) {
          setTrip(next);
        }
        setNotice(result);
        setPaying(false);
      };
      await openRazorpayCheckout({
        checkout: stay,
        description: booking.homeName,
        email: user?.primaryEmailAddress?.emailAddress,
        contact: guestCheckoutContact(user?.primaryPhoneNumber?.phoneNumber),
        onPaid: (response) => {
          void verifyStayCheckout({
            bookingId: booking.id,
            razorpayOrderId: response.razorpay_order_id,
            razorpayPaymentId: response.razorpay_payment_id,
            razorpaySignature: response.razorpay_signature,
          })
            .then(() => finish("success"))
            .catch(() => finish("failed"));
        },
        onFailed: () => {
          void finish("failed");
        },
        onDismiss: () => {
          void finish(null);
        },
      });
    } catch (payError) {
      setPaying(false);
      setError(payError instanceof Error ? payError.message : "Could not open Razorpay.");
    }
  };

  const copy = statusCopy(booking);
  const cancelLabel =
    quote.band === "none"
      ? "Cancel stay · this cancel is non-refundable"
      : `Cancel stay · you'll get ${formatInr(quote.refundPaise)} back`;

  return (
    <main className="mx-auto max-w-xl px-6 py-20 text-center">
      <p className="text-sm font-medium text-savings">{copy.kicker}</p>
      <h1 className="mt-3 text-3xl font-semibold tracking-tight">{copy.title}</h1>
      <p className="mt-4 text-muted">
        {booking.checkIn} – {booking.checkOut} · {booking.guests} guests · {formatInr(booking.totalPaise)}
      </p>
      {copy.detail ? <p className="mt-6 text-sm text-muted">{copy.detail}</p> : null}
      {notice === "success" ? <p className="mt-4 text-sm text-muted">Payment received.</p> : null}
      {notice === "failed" ? <p className="mt-4 text-sm text-muted">Payment did not go through. You can try again.</p> : null}
      {trip.payment ? (
        <div className="mt-8 rounded-2xl border border-line px-5 py-4 text-sm">
          <p className="font-medium">
            Payment · {paymentStatusLabel(trip.payment.status)}
          </p>
          <p className="mt-2 text-muted">
            {formatInr(trip.payment.amountPaise)} {trip.payment.currency} via {paymentProviderLabel(trip.payment.provider)}
          </p>
          <p className="mt-1 text-muted">Order {trip.payment.orderId}</p>
          {trip.payment.paymentId ? <p className="mt-1 text-muted">Payment {trip.payment.paymentId}</p> : null}
          <p className="mt-1 text-muted">{trip.payment.createdAt.slice(0, 16).replace("T", " ")} UTC</p>
        </div>
      ) : null}
      {booking.status === "pending_payment" ? (
        <div className="mt-8">
          {payable ? (
            <button
              type="button"
              className="rounded-full bg-foreground px-5 py-3 text-sm text-white disabled:opacity-40"
              disabled={paying}
              onClick={() => {
                void payStay();
              }}
            >
              {paying ? "Opening checkout…" : "Pay now"}
            </button>
          ) : (
            <p className="text-sm text-muted">
              {paymentsEnabled
                ? "This hold has expired. Start a new reserve if you still want the home."
                : "Payments are unavailable until Razorpay is configured."}
            </p>
          )}
          {error ? <p className="mt-3 text-sm text-muted">{error}</p> : null}
        </div>
      ) : null}
      {booking.status === "canceled" && trip.refund ? (
        <p className="mt-4 text-sm text-muted">
          Refund of {formatInr(trip.refund.amountPaise)} is {refundStatusLabel(trip.refund.status)}.
        </p>
      ) : null}
      {showCancel ? (
        <div className="mt-8">
          <button
            type="button"
            className="rounded-full border border-foreground px-5 py-3 text-sm disabled:opacity-40"
            disabled={pending}
            onClick={() => {
              void cancelStay();
            }}
          >
            {pending ? "Canceling…" : cancelLabel}
          </button>
          {error ? <p className="mt-3 text-sm text-muted">{error}</p> : null}
        </div>
      ) : null}
      <Link href={`/homes/${booking.homeSlug}`} className="mt-10 inline-block rounded-full bg-foreground px-5 py-3 text-sm text-white">
        Back to the home
      </Link>
    </main>
  );
}
