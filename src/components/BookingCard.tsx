"use client";

import { useSession, useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import type { Home } from "@/domain/home";
import { useChrome } from "@/components/ChromeProvider";
import { clerkSupabaseJwtTemplate } from "@/lib/clerk-supabase";
import { nightsBetween } from "@/lib/dates";
import { formatInr } from "@/lib/money";
import { guestCheckoutContact } from "@/lib/phone";
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
  const { isSignedIn, user } = useUser();
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
    const token = (await session?.getToken({ template: clerkSupabaseJwtTemplate })) ?? null;
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
        email: user?.primaryEmailAddress?.emailAddress,
        contact: guestCheckoutContact(user?.primaryPhoneNumber?.phoneNumber),
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
    <aside className="rounded-2xl border border-line p-6 shadow-[0_6px_16px_rgba(0,0,0,0.12)]">
      {quote.nights > 0 ? (
        <p className="text-[22px] leading-7">
          <span className="font-semibold underline decoration-1 underline-offset-4">{formatInr(quote.totalPaise)}</span>
          <span>
            {" "}
            for {quote.nights} {quote.nights === 1 ? "night" : "nights"}
          </span>
        </p>
      ) : (
        <p className="text-[22px] font-semibold">
          {formatInr(home.nightlyRatePaise)}
          <span className="text-sm font-normal text-muted"> / night</span>
        </p>
      )}
      <div className="mt-4 overflow-hidden rounded-xl border border-foreground/80">
        <div className="grid grid-cols-2">
          <label className="border-r border-foreground/80 px-3 py-2.5 text-[10px] font-semibold tracking-wide">
            CHECK-IN
            <input
              type="date"
              value={inDate}
              onChange={(event) => setInDate(event.target.value)}
              className="mt-0.5 block w-full bg-transparent text-sm font-normal outline-none"
            />
          </label>
          <label className="px-3 py-2.5 text-[10px] font-semibold tracking-wide">
            CHECKOUT
            <input
              type="date"
              value={outDate}
              onChange={(event) => setOutDate(event.target.value)}
              className="mt-0.5 block w-full bg-transparent text-sm font-normal outline-none"
            />
          </label>
        </div>
        <label className="block border-t border-foreground/80 px-3 py-2.5 text-[10px] font-semibold tracking-wide">
          GUESTS
          <input
            type="number"
            min={1}
            max={home.guests}
            value={who}
            onChange={(event) => setWho(Number(event.target.value))}
            className="mt-0.5 block w-full bg-transparent text-sm font-normal outline-none"
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
      <p className="mt-3 text-center text-xs text-muted">
        Pay in INR. On a phone, Reserve can open Google Pay or PhonePe. The stay confirms after payment is captured.
      </p>
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
