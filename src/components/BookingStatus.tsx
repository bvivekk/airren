"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { Booking } from "@/domain/booking";
import { formatInr } from "@/lib/money";
import { getBookingById } from "@/lib/bookings-repo";
import { useSupabaseClient } from "@/lib/supabase/browser";

function statusCopy(booking: Booking): { kicker: string; title: string; detail: string | null } {
  switch (booking.status) {
    case "pending_payment":
      return {
        kicker: "Waiting for payment",
        title: `Finish paying for ${booking.homeName}`,
        detail: "Razorpay is capturing the payment. This page updates when the stay is confirmed.",
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
    default: {
      const _never: never = booking.status;
      return _never;
    }
  }
}

export function BookingStatus({ initial }: { initial: Booking }) {
  const supabase = useSupabaseClient();
  const [booking, setBooking] = useState(initial);

  useEffect(() => {
    if (booking.status !== "pending_payment") {
      return;
    }
    let cancelled = false;
    const tick = window.setInterval(() => {
      void getBookingById(supabase, booking.id).then((next) => {
        if (!cancelled && next) {
          setBooking(next);
        }
      });
    }, 2000);
    return () => {
      cancelled = true;
      window.clearInterval(tick);
    };
  }, [booking.id, booking.status, supabase]);

  const copy = statusCopy(booking);

  return (
    <main className="mx-auto max-w-xl px-6 py-20 text-center">
      <p className="text-sm font-medium text-savings">{copy.kicker}</p>
      <h1 className="mt-3 text-3xl font-semibold tracking-tight">{copy.title}</h1>
      <p className="mt-4 text-muted">
        {booking.checkIn} – {booking.checkOut} · {booking.guests} guests · {formatInr(booking.totalPaise)}
      </p>
      {copy.detail ? <p className="mt-6 text-sm text-muted">{copy.detail}</p> : null}
      <Link href={`/homes/${booking.homeSlug}`} className="mt-10 inline-block rounded-full bg-foreground px-5 py-3 text-sm text-white">
        Back to the home
      </Link>
    </main>
  );
}
