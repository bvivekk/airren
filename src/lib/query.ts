import type { StayQuery } from "../domain/home";
import { defaultStayWindow } from "./dates";

type ParamMap = Record<string, string | string[] | undefined>;

function first(value: string | string[] | undefined): string {
  if (Array.isArray(value)) {
    return value[0] ?? "";
  }
  return value ?? "";
}

function parseGuests(raw: string): number {
  const n = Number.parseInt(raw, 10);
  if (!Number.isFinite(n) || n < 1) {
    return 2;
  }
  return Math.min(16, n);
}

export function parseStayQuery(params: ParamMap): StayQuery {
  const defaults = defaultStayWindow();
  const checkIn = first(params.checkIn) || first(params.when) || defaults.checkIn;
  const checkOut = first(params.checkOut) || defaults.checkOut;
  return {
    where: first(params.where),
    checkIn,
    checkOut: checkOut <= checkIn ? defaults.checkOut : checkOut,
    guests: parseGuests(first(params.who) || first(params.guests)),
  };
}
