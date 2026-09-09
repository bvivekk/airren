import type { DateFlexDays, FlexibleStayLength, StayQuery, StayWhen } from "../domain/home";
import { defaultStayWindow, parseYearMonth, windowFromFlexible } from "./dates.ts";

type ParamMap = Record<string, string | string[] | undefined>;

function first(value: string | string[] | undefined): string {
  if (Array.isArray(value)) {
    return value[0] ?? "";
  }
  return value ?? "";
}

function parseGuests(raw: string): number {
  if (raw === "") {
    return 2;
  }
  const n = Number.parseInt(raw, 10);
  if (!Number.isFinite(n) || n < 0) {
    return 2;
  }
  if (n === 0) {
    return 0;
  }
  return Math.min(16, n);
}

function parsePets(raw: string): number {
  if (raw === "") {
    return 0;
  }
  const n = Number.parseInt(raw, 10);
  if (!Number.isFinite(n) || n < 0) {
    return 0;
  }
  return Math.min(8, n);
}

function parseFlexDays(raw: string): DateFlexDays {
  switch (raw) {
    case "1":
      return 1;
    case "2":
      return 2;
    case "3":
      return 3;
    case "7":
      return 7;
    default:
      return 0;
  }
}

function parseStayLength(raw: string): FlexibleStayLength {
  return raw === "week" ? "week" : "weekend";
}

function parseMonths(raw: string): string[] {
  return raw
    .split(",")
    .map((item) => item.trim())
    .filter((item) => parseYearMonth(item) !== null);
}

function parseWhen(params: ParamMap): StayWhen {
  const stay = first(params.stay);
  const months = parseMonths(first(params.months));
  const flexible =
    first(params.whenMode) === "flexible" || stay !== "" || months.length > 0;
  if (flexible) {
    return {
      kind: "flexible",
      stay: parseStayLength(stay),
      months,
    };
  }
  return { kind: "dates", flexibility: parseFlexDays(first(params.flex)) };
}

export function parseStayQuery(params: ParamMap): StayQuery {
  const defaults = defaultStayWindow();
  const when = parseWhen(params);
  const guests = parseGuests(first(params.who) || first(params.guests));
  const pets = parsePets(first(params.pets));
  if (when.kind === "flexible") {
    const window = windowFromFlexible(when.stay, when.months);
    return {
      where: first(params.where),
      checkIn: first(params.checkIn) || window.checkIn,
      checkOut: first(params.checkOut) || window.checkOut,
      guests,
      pets,
      when,
    };
  }
  const checkIn = first(params.checkIn) || first(params.when) || defaults.checkIn;
  const checkOut = first(params.checkOut) || defaults.checkOut;
  return {
    where: first(params.where),
    checkIn,
    checkOut: checkOut <= checkIn ? defaults.checkOut : checkOut,
    guests,
    pets,
    when,
  };
}

export function stayWhoLabel(query: StayQuery): string {
  const guests =
    query.guests < 1 ? "Any guests" : `${query.guests} ${query.guests === 1 ? "guest" : "guests"}`;
  if (query.pets < 1) {
    return guests;
  }
  return `${guests} · ${query.pets} ${query.pets === 1 ? "pet" : "pets"}`;
}

function formatQueryDate(iso: string): string {
  const date = new Date(`${iso}T12:00:00`);
  if (!Number.isFinite(date.getTime())) {
    return iso;
  }
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export function stayWhenLabel(query: StayQuery): string {
  switch (query.when.kind) {
    case "flexible": {
      const month = query.when.months[0] ?? "";
      const stay = query.when.stay === "week" ? "Week" : "Weekend";
      return month ? `${stay} · ${month}` : stay;
    }
    case "dates": {
      const range = `${formatQueryDate(query.checkIn)} – ${formatQueryDate(query.checkOut)}`;
      if (query.when.flexibility === 0) {
        return range;
      }
      return `${range} ±${query.when.flexibility}`;
    }
    default: {
      const _never: never = query.when;
      return _never;
    }
  }
}
