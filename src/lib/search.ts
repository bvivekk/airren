import type { Home, StayQuery } from "../domain/home";

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

export function filterHomes(homes: Home[], query: StayQuery): Home[] {
  const where = query.where.trim().toLowerCase();
  return homes.filter((home) => {
    if (query.guests >= 1 && query.guests > home.guests) {
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
