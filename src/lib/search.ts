import type { Home, StayQuery } from "../domain/home";
import {
  addNights,
  stay,
  stayNights,
  stayOf,
  type CalendarSet,
  type HomeId,
  type Stay,
} from "../domain/occupancy.ts";

export const SUGGESTED_DESTINATIONS = ["California", "Florida", "North Carolina"] as const;

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

export type SearchResult = { home: Home; stay: Stay };

export function queryFlexibility(query: StayQuery): number {
  return query.when.kind === "dates" ? query.when.flexibility : 0;
}

export function searchWindow(query: StayQuery): Stay | null {
  const requested = stay(query.checkIn, query.checkOut);
  if (!requested) {
    return null;
  }
  const flex = queryFlexibility(query);
  return stayOf(addNights(requested.from, -flex), stayNights(requested) + 2 * flex);
}

export function openWindowFor(homeId: HomeId, calendars: CalendarSet, query: StayQuery): Stay | null {
  const requested = stay(query.checkIn, query.checkOut);
  if (!requested) {
    return null;
  }
  const calendar = calendars.for(homeId);
  const nights = stayNights(requested);
  const flex = queryFlexibility(query);
  for (let distance = 0; distance <= flex; distance += 1) {
    for (const offset of distance === 0 ? [0] : [-distance, distance]) {
      const candidate = stayOf(addNights(requested.from, offset), nights);
      if (calendar.firstSoldNight(candidate) === null) {
        return candidate;
      }
    }
  }
  return null;
}

export function filterHomes(homes: Home[], query: StayQuery, calendars: CalendarSet): SearchResult[] {
  const where = query.where.trim().toLowerCase();
  const results: SearchResult[] = [];
  for (const home of homes) {
    if (query.guests >= 1 && query.guests > home.guests) {
      continue;
    }
    if (query.pets >= 1 && !home.categoryIds.includes("pet-friendly")) {
      continue;
    }
    if (where) {
      const regionName = REGION_NAMES[home.location.region] ?? "";
      const haystack =
        `${home.name} ${home.location.city} ${home.location.region} ${regionName} ${home.location.country}`.toLowerCase();
      if (!haystack.includes(where)) {
        continue;
      }
    }
    const open = openWindowFor(home.id, calendars, query);
    if (!open) {
      continue;
    }
    results.push({ home, stay: open });
  }
  return results;
}
