import type { Home, StayQuery } from "../domain/home";
import { addDaysIso, nightsBetween } from "./dates.ts";

export const SUGGESTED_DESTINATIONS = ["California", "Florida", "North Carolina"] as const;

export type BusyStay = {
  homeId: string;
  checkIn: string;
  checkOut: string;
};

const REGION_NAMES: Record<string, string> = {
  AZ: "arizona",
  CA: "california",
  FL: "florida",
  HI: "hawaii",
  ID: "idaho",
  MT: "montana",
  NC: "north carolina",
  TN: "tennessee",
  UT: "utah",
  VT: "vermont",
};

export function dateRangesOverlap(aStart: string, aEnd: string, bStart: string, bEnd: string): boolean {
  return aStart < bEnd && bStart < aEnd;
}

export function queryFlexibility(query: StayQuery): number {
  return query.when.kind === "dates" ? query.when.flexibility : 0;
}

export function homeIsOpen(homeId: string, busy: BusyStay[], query: StayQuery): boolean {
  const nights = nightsBetween(query.checkIn, query.checkOut);
  if (nights <= 0) {
    return true;
  }
  const flex = queryFlexibility(query);
  for (let offset = -flex; offset <= flex; offset += 1) {
    const start = addDaysIso(query.checkIn, offset);
    const end = addDaysIso(start, nights);
    const blocked = busy.some(
      (stay) => stay.homeId === homeId && dateRangesOverlap(start, end, stay.checkIn, stay.checkOut),
    );
    if (!blocked) {
      return true;
    }
  }
  return false;
}

export function filterHomes(homes: Home[], query: StayQuery, busy: BusyStay[] = []): Home[] {
  const where = query.where.trim().toLowerCase();
  return homes.filter((home) => {
    if (query.guests >= 1 && query.guests > home.guests) {
      return false;
    }
    if (query.pets >= 1 && !home.categoryIds.includes("pet-friendly")) {
      return false;
    }
    if (!homeIsOpen(home.id, busy, query)) {
      return false;
    }
    if (!where) {
      return true;
    }
    const regionName = REGION_NAMES[home.location.region] ?? "";
    const haystack =
      `${home.name} ${home.location.city} ${home.location.region} ${regionName} ${home.location.country}`.toLowerCase();
    return haystack.includes(where);
  });
}
