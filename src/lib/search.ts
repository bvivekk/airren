import type { Home, StayQuery } from "../domain/home";

export function filterHomes(homes: Home[], query: StayQuery): Home[] {
  const where = query.where.trim().toLowerCase();
  return homes.filter((home) => {
    if (query.guests > home.guests) {
      return false;
    }
    if (!where) {
      return true;
    }
    const haystack = `${home.name} ${home.location.city} ${home.location.region} ${home.location.country}`.toLowerCase();
    return haystack.includes(where);
  });
}
