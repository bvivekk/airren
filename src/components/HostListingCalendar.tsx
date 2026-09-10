"use client";

import { useState } from "react";
import {
  occupancyMessage,
  stay,
  type CalendarEntry,
  type IsoDate,
  type OccupancyId,
  type OccupancySource,
} from "@/domain/occupancy";
import { recordHostOccupancy, releaseHostOccupancy } from "@/lib/occupancy-repo";
import { useSupabaseClient } from "@/lib/supabase/browser";

function formatDay(day: IsoDate): string {
  return new Date(`${day}T12:00:00`).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function fallbackTitle(source: OccupancySource): string {
  switch (source) {
    case "airren":
      return "Booked on Airren";
    case "host":
      return "Blocked";
    case "external":
      return "Booked on Airbnb";
    default: {
      const _never: never = source;
      return _never;
    }
  }
}

const FIELD_CLASS = "mt-2 w-full rounded-full border border-line bg-white px-4 py-2.5 text-sm outline-none";

export function HostListingCalendar({
  listingId,
  initialEntries,
}: {
  listingId: string;
  initialEntries: CalendarEntry[];
}) {
  const supabase = useSupabaseClient();
  const [entries, setEntries] = useState(initialEntries);
  const [checkIn, setCheckIn] = useState("");
  const [checkOut, setCheckOut] = useState("");
  const [label, setLabel] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  const block = async () => {
    const nights = stay(checkIn, checkOut);
    if (!nights) {
      setError(occupancyMessage("invalid-dates"));
      return;
    }
    setPending(true);
    setError("");
    try {
      const result = await recordHostOccupancy(supabase, listingId, nights, { label });
      if (!result.ok) {
        setError(occupancyMessage(result.reason));
        return;
      }
      setEntries(result.value);
      setCheckIn("");
      setCheckOut("");
      setLabel("");
    } catch (blockError) {
      setError(blockError instanceof Error ? blockError.message : "Could not block those nights.");
    } finally {
      setPending(false);
    }
  };

  const unblock = async (id: OccupancyId) => {
    setPending(true);
    setError("");
    try {
      const result = await releaseHostOccupancy(supabase, id);
      if (!result.ok) {
        setError(occupancyMessage(result.reason));
        return;
      }
      setEntries(result.value);
    } catch (releaseError) {
      setError(releaseError instanceof Error ? releaseError.message : "Could not open those nights.");
    } finally {
      setPending(false);
    }
  };

  return (
    <div className="space-y-8">
      <section className="rounded-3xl border border-line bg-white p-5">
        <h2 className="text-lg font-semibold">Block nights</h2>
        <p className="mt-1 text-sm text-muted">
          Booked somewhere else, or keeping the home for yourself? Those nights stop selling on
          Airren the moment you block them.
        </p>
        <form
          className="mt-4 grid gap-4 sm:grid-cols-3"
          onSubmit={(event) => {
            event.preventDefault();
            void block();
          }}
        >
          <label className="block text-sm font-medium">
            First night
            <input
              type="date"
              value={checkIn}
              onChange={(event) => setCheckIn(event.target.value)}
              className={FIELD_CLASS}
            />
          </label>
          <label className="block text-sm font-medium">
            Checkout day
            <input
              type="date"
              value={checkOut}
              onChange={(event) => setCheckOut(event.target.value)}
              className={FIELD_CLASS}
            />
          </label>
          <label className="block text-sm font-medium">
            Label (optional)
            <input
              value={label}
              onChange={(event) => setLabel(event.target.value)}
              placeholder="Booked on Airbnb"
              className={FIELD_CLASS}
            />
          </label>
          <div className="sm:col-span-3">
            <button
              type="submit"
              disabled={pending}
              className="rounded-full bg-foreground px-6 py-3 text-sm font-medium text-white disabled:opacity-60"
            >
              Block nights
            </button>
          </div>
        </form>
        {error ? <p className="mt-3 text-sm text-muted">{error}</p> : null}
      </section>

      <section className="rounded-3xl border border-line bg-white p-5">
        <h2 className="text-lg font-semibold">Upcoming stays and blocks</h2>
        {entries.length === 0 ? (
          <p className="mt-3 text-sm text-muted">Every night is open.</p>
        ) : (
          <ul className="mt-3 divide-y divide-line">
            {entries.map((entry) => (
              <li key={entry.id} className="flex items-center justify-between gap-4 py-3">
                <div>
                  <p className="text-sm font-medium">{entry.label ?? fallbackTitle(entry.source)}</p>
                  <p className="mt-0.5 text-sm text-muted">
                    {formatDay(entry.stay.from)} – {formatDay(entry.stay.to)}
                  </p>
                </div>
                {entry.removable ? (
                  <button
                    type="button"
                    disabled={pending}
                    onClick={() => void unblock(entry.id)}
                    className="rounded-full border border-line px-4 py-2 text-sm font-medium disabled:opacity-60"
                  >
                    Remove
                  </button>
                ) : (
                  <span className="text-xs font-medium uppercase tracking-wide text-muted">Booked</span>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
