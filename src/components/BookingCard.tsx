"use client";

import { useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import type { Home } from "@/domain/home";
import { useChrome } from "@/components/ChromeProvider";
import { nightsBetween } from "@/lib/dates";
import { formatInr } from "@/lib/money";
import { requestStayCheckout, verifyStayCheckout } from "@/lib/payments/checkout-client";
import { guestCheckoutContact } from "@/lib/phone";
import { quoteStay } from "@/lib/pricing";
import { openRazorpayCheckout } from "@/lib/razorpay-checkout";

export function BookingCard({
  home,
  checkIn,
  checkOut,
  guests,
  paymentsEnabled,
}: {
  home: Home;
  checkIn: string;
  checkOut: string;
  guests: number;
  paymentsEnabled: boolean;
}) {
  const router = useRouter();
  const { isSignedIn, user } = useUser();
  const { setSignInOpen } = useChrome();
  const [inDate, setInDate] = useState(checkIn);
  const [outDate, setOutDate] = useState(checkOut);
  const [who, setWho] = useState(guests);
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const nights = nightsBetween(inDate, outDate);
  const quote = useMemo(() => quoteStay(home.nightlyRatePaise, nights), [home.nightlyRatePaise, nights]);

  const startCheckout = async () => {
    if (!paymentsEnabled || quote.nights <= 0 || who < 1 || who > home.guests) {
      return;
    }
    setPending(true);
    setError("");
    let bookingId = "";
    try {
      const stay = await requestStayCheckout({
        homeId: home.id,
        checkIn: inDate,
        checkOut: outDate,
        guests: who,
      });
      bookingId = stay.bookingId;
      let settled = false;
      const finish = (path: string) => {
        if (settled) {
          return;
        }
        settled = true;
        setPending(false);
        router.push(path);
      };
      await openRazorpayCheckout({
        checkout: stay,
        description: home.name,
        email: user?.primaryEmailAddress?.emailAddress,
        contact: guestCheckoutContact(user?.primaryPhoneNumber?.phoneNumber),
        onPaid: (response) => {
          void verifyStayCheckout({
            bookingId: stay.bookingId,
            razorpayOrderId: response.razorpay_order_id,
            razorpayPaymentId: response.razorpay_payment_id,
            razorpaySignature: response.razorpay_signature,
          })
            .then(() => {
              finish(`/bookings/${stay.bookingId}?payment=success`);
            })
            .catch(() => {
              finish(`/bookings/${stay.bookingId}?payment=failed`);
            });
        },
        onFailed: () => {
          finish(`/bookings/${stay.bookingId}?payment=failed`);
        },
        onDismiss: () => {
          finish(`/bookings/${stay.bookingId}`);
        },
      });
    } catch (checkoutError) {
      setPending(false);
      if (bookingId) {
        router.push(`/bookings/${bookingId}`);
        return;
      }
      setError(checkoutError instanceof Error ? checkoutError.message : "Could not start checkout.");
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
        disabled={!paymentsEnabled || quote.nights === 0 || who < 1 || who > home.guests || pending}
        onClick={() => {
          if (!paymentsEnabled) {
            return;
          }
          if (!isSignedIn) {
            setSignInOpen(true);
            return;
          }
          void startCheckout();
        }}
      >
        {pending ? "Opening checkout…" : "Reserve"}
      </button>
      {error ? <p className="mt-3 text-center text-xs text-muted">{error}</p> : null}
      <p className="mt-3 text-center text-xs text-muted">
        {paymentsEnabled
          ? "Pay in INR with UPI, cards, or netbanking. The stay confirms after Razorpay verifies the payment."
          : "Payments are unavailable until Razorpay is configured."}
      </p>
      {quote.nights > 0 ? (
        <dl className="mt-4 space-y-2 text-sm">
          <div className="flex justify-between">
            <dt>
              {formatInr(home.nightlyRatePaise)} × {quote.nights} nights
            </dt>
            <dd>{formatInr(quote.subtotalPaise)}</dd>
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
