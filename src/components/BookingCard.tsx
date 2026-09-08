"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import type { Home } from "@/domain/home";
import { nightsBetween } from "@/lib/dates";
import { formatUsd } from "@/lib/money";
import { quoteStay } from "@/lib/pricing";
import { bookingHref } from "@/lib/query";

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
  const [inDate, setInDate] = useState(checkIn);
  const [outDate, setOutDate] = useState(checkOut);
  const [who, setWho] = useState(guests);
  const nights = nightsBetween(inDate, outDate);
  const quote = useMemo(() => quoteStay(home.nightlyRateCents, nights), [home.nightlyRateCents, nights]);

  return (
    <aside className="rounded-3xl border border-line p-5 shadow-[0_12px_40px_rgba(0,0,0,0.06)]">
      <p className="text-2xl font-semibold">
        {formatUsd(home.nightlyRateCents)}
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
        disabled={quote.nights === 0 || who > home.guests}
        onClick={() =>
          router.push(
            bookingHref(home.slug, {
              where: home.location.city,
              checkIn: inDate,
              checkOut: outDate,
              guests: who,
            }),
          )
        }
      >
        Reserve
      </button>
      <p className="mt-3 text-center text-xs text-muted">You will not be charged. This is a demo hold.</p>
      {quote.nights > 0 ? (
        <dl className="mt-4 space-y-2 text-sm">
          <div className="flex justify-between">
            <dt>
              {formatUsd(home.nightlyRateCents)} × {quote.nights} nights
            </dt>
            <dd>{formatUsd(quote.subtotalCents)}</dd>
          </div>
          <div className="flex justify-between text-muted">
            <dt>Cleaning</dt>
            <dd>{formatUsd(quote.cleaningFeeCents)}</dd>
          </div>
          <div className="flex justify-between text-muted">
            <dt>Service</dt>
            <dd>{formatUsd(quote.serviceFeeCents)}</dd>
          </div>
          <div className="flex justify-between border-t border-line pt-2 font-semibold">
            <dt>Total</dt>
            <dd>{formatUsd(quote.totalCents)}</dd>
          </div>
        </dl>
      ) : null}
    </aside>
  );
}
