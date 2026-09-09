"use client";

import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { defaultStayWindow } from "@/lib/dates";

export function SearchPill({ anchor = false }: { anchor?: boolean }) {
  const params = useSearchParams();
  return <SearchPillFields key={params.toString()} params={params} anchor={anchor} />;
}

function SearchPillFields({
  params,
  anchor,
}: {
  params: ReturnType<typeof useSearchParams>;
  anchor: boolean;
}) {
  const defaults = defaultStayWindow();
  const [where, setWhere] = useState(params.get("where") ?? "");
  const [checkIn, setCheckIn] = useState(params.get("checkIn") ?? defaults.checkIn);
  const [checkOut, setCheckOut] = useState(params.get("checkOut") ?? defaults.checkOut);
  const [guests, setGuests] = useState(Number(params.get("who") ?? "2"));

  return (
    <form
      id={anchor ? "search" : undefined}
      action="/search"
      method="get"
      className="flex h-12 w-full max-w-[720px] items-stretch rounded-full bg-white py-1 pl-1 pr-1 shadow-[0_8px_30px_rgba(0,0,0,0.12)]"
    >
      <label className="relative flex min-w-0 flex-[1.15] cursor-text items-center rounded-full px-5">
        <span className={`text-[13px] font-medium text-foreground ${where ? "sr-only" : ""}`}>Where</span>
        <input
          name="where"
          value={where}
          onChange={(event) => setWhere(event.target.value)}
          placeholder=""
          aria-label="Where"
          className={`w-full bg-transparent text-[13px] font-medium text-foreground outline-none ${
            where ? "" : "absolute inset-0 cursor-text opacity-0"
          }`}
        />
      </label>
      <span className="my-auto h-6 w-px bg-black/10" aria-hidden="true" />
      <div className="relative flex w-[8.5rem] items-center justify-center px-4">
        <span className="text-[13px] font-medium text-foreground">When</span>
        <input
          type="date"
          name="checkIn"
          value={checkIn}
          aria-label="Check in"
          onChange={(event) => setCheckIn(event.target.value)}
          className="absolute inset-0 w-1/2 cursor-pointer opacity-0"
        />
        <input
          type="date"
          name="checkOut"
          value={checkOut}
          aria-label="Check out"
          onChange={(event) => setCheckOut(event.target.value)}
          className="absolute inset-y-0 right-0 w-1/2 cursor-pointer opacity-0"
        />
      </div>
      <span className="my-auto h-6 w-px bg-black/10" aria-hidden="true" />
      <label className="relative flex w-[6.5rem] items-center justify-center px-4">
        <span className="text-[13px] font-medium text-foreground">Who</span>
        <input
          type="number"
          min={1}
          max={16}
          name="who"
          value={guests}
          onChange={(event) => setGuests(Number(event.target.value))}
          aria-label="Who"
          className="absolute inset-0 cursor-text opacity-0"
        />
      </label>
      <button
        type="submit"
        className="my-auto mr-0.5 rounded-full bg-foreground px-5 py-2.5 text-[13px] font-medium text-white"
      >
        Search
      </button>
    </form>
  );
}
