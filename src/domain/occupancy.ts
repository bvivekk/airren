declare const isoDateBrand: unique symbol;
declare const stayBrand: unique symbol;

export type HomeId = string;
export type OccupancyId = string;

/** A calendar day, `YYYY-MM-DD`, validated. */
export type IsoDate = string & { readonly [isoDateBrand]: true };

/**
 * A half-open range of nights, `[from, to)`. `to` is the checkout day and is never
 * occupied, so same-day turnover is legal. Unconstructable when `to <= from`.
 */
export type Stay = { readonly from: IsoDate; readonly to: IsoDate; readonly [stayBrand]: true };

const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const DAY_MS = 86_400_000;

export function isoDate(value: string): IsoDate | null {
  if (!ISO_DATE_PATTERN.test(value)) {
    return null;
  }
  const time = Date.parse(`${value}T00:00:00Z`);
  if (!Number.isFinite(time) || new Date(time).toISOString().slice(0, 10) !== value) {
    return null;
  }
  return value as IsoDate;
}

export function addNights(day: IsoDate, count: number): IsoDate {
  const shifted = new Date(Date.parse(`${day}T00:00:00Z`) + count * DAY_MS);
  return shifted.toISOString().slice(0, 10) as IsoDate;
}

export function stay(from: string, to: string): Stay | null {
  const start = isoDate(from);
  const end = isoDate(to);
  if (start === null || end === null || end <= start) {
    return null;
  }
  return { from: start, to: end } as Stay;
}

export function stayOf(from: IsoDate, nightCount: number): Stay {
  const nights = Math.max(1, Math.trunc(nightCount));
  return { from, to: addNights(from, nights) } as Stay;
}

export function stayNights(value: Stay): number {
  return Math.round((Date.parse(`${value.to}T00:00:00Z`) - Date.parse(`${value.from}T00:00:00Z`)) / DAY_MS);
}

export const OCCUPANCY_SOURCES = ["airren", "host"] as const;
export type OccupancySource = (typeof OCCUPANCY_SOURCES)[number];

export type CalendarEntry = {
  readonly id: OccupancyId;
  readonly stay: Stay;
  readonly source: OccupancySource;
  readonly label: string | null;
  readonly removable: boolean;
};

/**
 * Availability questions a date picker asks. Owns the half-open convention, same-day
 * turnover, and the sold-night representation. Answers occupancy only; "not in the
 * past" stays with the caller.
 */
export interface Calendar {
  canStartOn(day: IsoDate): boolean;
  canEndOn(start: IsoDate, day: IsoDate): boolean;
  /** Latest legal checkout for a stay beginning on `start`; clamped to the loaded window. */
  latestCheckOut(start: IsoDate): IsoDate;
  /** First night in `value` that is already sold, or null when the whole stay is open. */
  firstSoldNight(value: Stay): IsoDate | null;
}

/** Serializable calendar input; the shape that crosses the server-to-client boundary. */
export type CalendarData = {
  readonly window: Stay;
  readonly stays: readonly Stay[];
};

export interface CalendarSet {
  /** A home with no rows in the window gets an all-open calendar, not undefined. */
  for(homeId: HomeId): Calendar;
  dataFor(homeId: HomeId): CalendarData;
}

export function calendarFrom(data: CalendarData): Calendar {
  const sold = new Set<string>();
  for (const value of data.stays) {
    const from = value.from > data.window.from ? value.from : data.window.from;
    const to = value.to < data.window.to ? value.to : data.window.to;
    for (let night = from; night < to; night = addNights(night, 1)) {
      sold.add(night);
    }
  }
  const firstSoldNight = (value: Stay): IsoDate | null => {
    for (let night = value.from; night < value.to; night = addNights(night, 1)) {
      if (sold.has(night)) {
        return night;
      }
    }
    return null;
  };
  return {
    canStartOn: (day) => !sold.has(day),
    canEndOn(start, day) {
      if (day <= start) {
        return false;
      }
      for (let night = start; night < day; night = addNights(night, 1)) {
        if (sold.has(night)) {
          return false;
        }
      }
      return true;
    },
    latestCheckOut(start) {
      let day = start;
      while (day < data.window.to && !sold.has(day)) {
        day = addNights(day, 1);
      }
      return day;
    },
    firstSoldNight,
  };
}

/** Pure: groups ranges by home for the window. No I/O, no Supabase types. */
export function calendarsFrom(ranges: Iterable<{ homeId: HomeId; stay: Stay }>, window: Stay): CalendarSet {
  const byHome = new Map<HomeId, Stay[]>();
  for (const range of ranges) {
    const stays = byHome.get(range.homeId);
    if (stays) {
      stays.push(range.stay);
    } else {
      byHome.set(range.homeId, [range.stay]);
    }
  }
  const allOpen: CalendarData = { window, stays: [] };
  const dataFor = (homeId: HomeId): CalendarData => {
    const stays = byHome.get(homeId);
    return stays ? { window, stays } : allOpen;
  };
  return {
    dataFor,
    for: (homeId) => calendarFrom(dataFor(homeId)),
  };
}

export type OccupancyFailure = "conflict" | "not-yours" | "airren-stay" | "invalid-dates";
export type OccupancyResult<T> = { ok: true; value: T } | { ok: false; reason: OccupancyFailure };

export function occupancyMessage(reason: OccupancyFailure): string {
  switch (reason) {
    case "conflict":
      return "Those nights are already taken.";
    case "not-yours":
      return "That listing is not yours.";
    case "airren-stay":
      return "That stay was booked on Airren and cannot be removed here.";
    case "invalid-dates":
      return "Checkout must be after check-in.";
    default: {
      const _never: never = reason;
      return _never;
    }
  }
}
