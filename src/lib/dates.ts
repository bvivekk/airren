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

export function nightsBetween(checkIn: string, checkOut: string): number {
  const start = Date.parse(`${checkIn}T12:00:00`);
  const end = Date.parse(`${checkOut}T12:00:00`);
  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) {
    return 0;
  }
  return Math.round((end - start) / 86_400_000);
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

export function windowFromFlexible(
  stay: "weekend" | "week",
  months: string[],
): { checkIn: string; checkOut: string } {
  const parsed = months.map(parseYearMonth).find((item) => item !== null);
  if (!parsed) {
    return defaultStayWindow();
  }
  if (stay === "weekend") {
    const checkIn = firstWeekdayOnOrAfter(parsed.year, parsed.month, 5);
    return { checkIn, checkOut: addDaysIso(checkIn, 2) };
  }
  const checkIn = `${yearMonthKey(parsed.year, parsed.month)}-01`;
  return { checkIn, checkOut: addDaysIso(checkIn, 7) };
}
