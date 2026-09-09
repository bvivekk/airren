export function isoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function todayIso(): string {
  return isoDate(new Date());
}

export function addDaysIso(iso: string, days: number): string {
  const date = new Date(`${iso}T12:00:00`);
  date.setDate(date.getDate() + days);
  return isoDate(date);
}

export function isIsoDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }
  const parsed = new Date(`${value}T12:00:00`);
  return Number.isFinite(parsed.getTime()) && isoDate(parsed) === value;
}

export function nightsBetween(checkIn: string, checkOut: string): number {
  const start = Date.parse(`${checkIn}T12:00:00`);
  const end = Date.parse(`${checkOut}T12:00:00`);
  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) {
    return 0;
  }
  return Math.round((end - start) / 86_400_000);
}

export function repairCheckOut(checkIn: string, checkOut: string): string {
  if (isIsoDate(checkOut) && checkOut > checkIn) {
    return checkOut;
  }
  if (checkOut === "") {
    return addDaysIso(checkIn, 3);
  }
  return addDaysIso(checkIn, 1);
}

export function defaultStayWindow(): { checkIn: string; checkOut: string } {
  const checkIn = addDaysIso(todayIso(), 7);
  return { checkIn, checkOut: addDaysIso(checkIn, 3) };
}

export function parseYearMonth(value: string): { year: number; month: number } | null {
  const match = /^(\d{4})-(\d{2})$/.exec(value);
  if (!match) {
    return null;
  }
  const year = Number(match[1]);
  const month = Number(match[2]);
  if (month < 1 || month > 12) {
    return null;
  }
  return { year, month };
}

export function yearMonthKey(year: number, month: number): string {
  return `${year}-${String(month).padStart(2, "0")}`;
}

export function upcomingYearMonths(fromIso: string, count: number): string[] {
  const start = new Date(`${fromIso}T12:00:00`);
  const months: string[] = [];
  for (let i = 0; i < count; i += 1) {
    const date = new Date(start.getFullYear(), start.getMonth() + i, 1, 12);
    months.push(yearMonthKey(date.getFullYear(), date.getMonth() + 1));
  }
  return months;
}

export function firstWeekdayOnOrAfter(year: number, month: number, weekday: number): string {
  const date = new Date(year, month - 1, 1, 12);
  const delta = (weekday - date.getDay() + 7) % 7;
  date.setDate(date.getDate() + delta);
  return isoDate(date);
}

function futureWeekendInMonth(
  year: number,
  month: number,
  fromIso: string,
): { checkIn: string; checkOut: string } | null {
  const monthKey = yearMonthKey(year, month);
  let checkIn = firstWeekdayOnOrAfter(year, month, 5);
  while (checkIn.startsWith(monthKey)) {
    if (checkIn >= fromIso) {
      return { checkIn, checkOut: addDaysIso(checkIn, 2) };
    }
    checkIn = addDaysIso(checkIn, 7);
  }
  return null;
}

function futureWeekInMonth(
  year: number,
  month: number,
  fromIso: string,
): { checkIn: string; checkOut: string } | null {
  const monthKey = yearMonthKey(year, month);
  let checkIn = `${monthKey}-01`;
  while (checkIn.startsWith(monthKey)) {
    if (checkIn >= fromIso) {
      return { checkIn, checkOut: addDaysIso(checkIn, 7) };
    }
    checkIn = addDaysIso(checkIn, 7);
  }
  return null;
}

export function windowFromFlexible(
  stay: "weekend" | "week",
  months: string[],
  fromIso: string = todayIso(),
): { checkIn: string; checkOut: string } {
  const parsed = months
    .map(parseYearMonth)
    .filter((item): item is { year: number; month: number } => item !== null)
    .sort((a, b) => a.year - b.year || a.month - b.month);
  for (const month of parsed) {
    let window: { checkIn: string; checkOut: string } | null;
    switch (stay) {
      case "weekend":
        window = futureWeekendInMonth(month.year, month.month, fromIso);
        break;
      case "week":
        window = futureWeekInMonth(month.year, month.month, fromIso);
        break;
      default: {
        const _never: never = stay;
        return _never;
      }
    }
    if (window) {
      return window;
    }
  }
  return defaultStayWindow();
}
