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
