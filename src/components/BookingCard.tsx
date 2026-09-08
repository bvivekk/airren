"use client";

import { useSession, useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import type { Home } from "@/domain/home";
import { useChrome } from "@/components/ChromeProvider";
import { nightsBetween } from "@/lib/dates";
import { formatInr } from "@/lib/money";
import { quoteStay } from "@/lib/pricing";
import { openRazorpayCheckout, type StayCheckout } from "@/lib/razorpay-checkout";
import { useSupabaseClient } from "@/lib/supabase/browser";

export function BookingCard({
  home,
  checkIn,
  checkOut,
  guests,
}: {
  home: Home;
  checkIn: string;
  checkOut: string;
  guests: number;
}) {
  const router = useRouter();
  const { isSignedIn } = useUser();
  const { session } = useSession();
  const { setSignInOpen } = useChrome();
  const supabase = useSupabaseClient();
  const [inDate, setInDate] = useState(checkIn);
  const [outDate, setOutDate] = useState(checkOut);
  const [who, setWho] = useState(guests);
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const nights = nightsBetween(inDate, outDate);
  const quote = useMemo(() => quoteStay(home.nightlyRatePaise, nights), [home.nightlyRatePaise, nights]);

  const startCheckout = async () => {
    if (quote.nights <= 0 || who < 1 || who > home.guests) {
      return;
    }
    setPending(true);
    setError("");
    const token = (await session?.getToken()) ?? null;
    const { data, error: invokeError } = await supabase.functions.invoke("create-stay-checkout", {
      body: {
        homeId: home.id,
        checkIn: inDate,
        checkOut: outDate,
        guests: who,
      },
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (invokeError) {
      setPending(false);
      setError(invokeError.message || "Could not start checkout.");
      return;
    }
    const checkout = data as StayCheckout | { error?: string } | null;
    if (!checkout || ("error" in checkout && checkout.error)) {
      setPending(false);
      setError((checkout && "error" in checkout && checkout.error) || "Could not start checkout.");
      return;
    }
    const stay = checkout as StayCheckout;
    try {
      await openRazorpayCheckout({
        checkout: stay,
        description: home.name,
        onPaid: () => {
          router.push(`/bookings/${stay.bookingId}`);
        },
        onDismiss: () => {
          router.push(`/bookings/${stay.bookingId}`);
        },
      });
    } catch (checkoutError) {
      setError(checkoutError instanceof Error ? checkoutError.message : "Could not open Razorpay.");
    } finally {
      setPending(false);
    }
  };

  return (
    <aside className="rounded-3xl border border-line p-5 shadow-[0_12px_40px_rgba(0,0,0,0.06)]">
      <p className="text-2xl font-semibold">
        {formatInr(home.nightlyRatePaise)}
        <span className="text-sm font-normal text-muted"> / night</span>
      </p>
      <div className="mt-4 grid grid-cols-2 gap-2">
        <label className="rounded-2xl border border-line px-3 py-2 text-[11px] font-semibold">
          Check in
          <input
            type="date"
            value={inDate}
            onChange={(event) => setInDate(event.target.value)}
            className="mt-1 block w-full text-sm font-normal outline-none"
          />
        </label>
        <label className="rounded-2xl border border-line px-3 py-2 text-[11px] font-semibold">
          Check out
          <input
            type="date"
            value={outDate}
            onChange={(event) => setOutDate(event.target.value)}
            className="mt-1 block w-full text-sm font-normal outline-none"
          />
        </label>
        <label className="col-span-2 rounded-2xl border border-line px-3 py-2 text-[11px] font-semibold">
          Guests
          <input
            type="number"
            min={1}
            max={home.guests}
            value={who}
            onChange={(event) => setWho(Number(event.target.value))}
            className="mt-1 block w-full text-sm font-normal outline-none"
          />
        </label>
      </div>
      <button
        type="button"
        className="mt-4 w-full rounded-full bg-foreground py-3 text-sm font-medium text-white disabled:opacity-40"
        disabled={quote.nights === 0 || who < 1 || who > home.guests || pending}
        onClick={() => {
          if (!isSignedIn) {
            setSignInOpen(true);
            return;
          }
          void startCheckout();
        }}
      >
        Reserve
      </button>
      {error ? <p className="mt-3 text-center text-xs text-muted">{error}</p> : null}
      <p className="mt-3 text-center text-xs text-muted">You pay in INR with Razorpay. The stay confirms after payment is captured.</p>
      {quote.nights > 0 ? (
        <dl className="mt-4 space-y-2 text-sm">
          <div className="flex justify-between">
            <dt>
              {formatInr(home.nightlyRatePaise)} × {quote.nights} nights
            </dt>
            <dd>{formatInr(quote.subtotalPaise)}</dd>
          </div>
          <div className="flex justify-between text-muted">
            <dt>Cleaning</dt>
            <dd>{formatInr(quote.cleaningFeePaise)}</dd>
          </div>
          <div className="flex justify-between text-muted">
            <dt>Service</dt>
            <dd>{formatInr(quote.serviceFeePaise)}</dd>
          </div>
          <div className="flex justify-between border-t border-line pt-2 font-semibold">
            <dt>Total</dt>
            <dd>{formatInr(quote.totalPaise)}</dd>
          </div>
        </dl>
      ) : null}
    </aside>
  );
}
