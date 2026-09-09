import type { DateFlexDays, FlexibleStayLength, StayQuery, StayWhen } from "../domain/home";
import { defaultStayWindow, isIsoDate, parseYearMonth, repairCheckOut, windowFromFlexible } from "./dates.ts";

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

function parseCheckIn(raw: string, fallback: string): string {
  return isIsoDate(raw) ? raw : fallback;
}

export function parseStayQuery(params: ParamMap): StayQuery {
  const defaults = defaultStayWindow();
  const when = parseWhen(params);
  const guests = parseGuests(first(params.who) || first(params.guests));
  const pets = parsePets(first(params.pets));
  switch (when.kind) {
    case "flexible": {
      const window = windowFromFlexible(when.stay, when.months);
      return {
        where: first(params.where),
        checkIn: window.checkIn,
        checkOut: window.checkOut,
        guests,
        pets,
        when,
      };
    }
    case "dates": {
      const checkIn = parseCheckIn(first(params.checkIn) || first(params.when), defaults.checkIn);
      return {
        where: first(params.where),
        checkIn,
        checkOut: repairCheckOut(checkIn, first(params.checkOut)),
        guests,
        pets,
        when,
      };
    }
    default: {
      const _never: never = when;
      return _never;
    }
  }
}

export function stayQuerySearchParams(query: StayQuery): URLSearchParams {
  const params = new URLSearchParams({
    where: query.where,
    checkIn: query.checkIn,
    checkOut: query.checkOut,
    who: String(query.guests),
    pets: String(query.pets),
  });
  switch (query.when.kind) {
    case "flexible":
      params.set("whenMode", "flexible");
      params.set("stay", query.when.stay);
      params.set("months", query.when.months.join(","));
      break;
    case "dates":
      params.set("whenMode", "dates");
      params.set("flex", String(query.when.flexibility));
      break;
    default: {
      const _never: never = query.when;
      return _never;
    }
  }
  return params;
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

function joinList(parts: string[], lastSeparator: "and" | "or"): string {
  if (parts.length === 0) {
    return "";
  }
  if (parts.length === 1) {
    return parts[0] ?? "";
  }
  if (parts.length === 2) {
    return `${parts[0]} ${lastSeparator} ${parts[1]}`;
  }
  return `${parts.slice(0, -1).join(", ")}, ${lastSeparator} ${parts[parts.length - 1]}`;
}

export function emptySearchMessage(query: StayQuery): string {
  const filters = ["dates"];
  if (query.guests >= 1) {
    filters.push("guests");
  }
  if (query.pets >= 1) {
    filters.push("pets");
  }
  if (query.where.trim()) {
    filters.push("place");
  }
  const suggestions: string[] = [];
  if (query.guests >= 1) {
    suggestions.push("fewer people");
  }
  if (query.pets >= 1) {
    suggestions.push("skipping pets");
  }
  suggestions.push("another place");
  return `No homes match those ${joinList(filters, "and")}. Try ${joinList(suggestions, "or")}.`;
}
