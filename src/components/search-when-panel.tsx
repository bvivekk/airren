import { useState } from "react";
import type { DateFlexDays, FlexibleStayLength } from "@/domain/home";
import { DATE_FLEX_DAYS } from "@/domain/home";
import { parseYearMonth, todayIso, upcomingYearMonths, yearMonthKey } from "@/lib/dates";

export function SearchWhenPanel({
  whenKind,
  checkIn,
  checkOut,
  flexibility,
  stay,
  months,
  onKind,
  onClear,
  onDay,
  onFlexibility,
  onStay,
  onToggleMonth,
}: {
  whenKind: "dates" | "flexible";
  checkIn: string;
  checkOut: string;
  flexibility: DateFlexDays;
  stay: FlexibleStayLength;
  months: string[];
  onKind: (kind: "dates" | "flexible") => void;
  onClear: () => void;
  onDay: (iso: string) => void;
  onFlexibility: (days: DateFlexDays) => void;
  onStay: (stay: FlexibleStayLength) => void;
  onToggleMonth: (key: string) => void;
}) {
  return (
    <div
      role="dialog"
      aria-label="When"
      className="absolute top-[calc(100%+10px)] left-0 z-20 w-full min-w-[min(100vw-2rem,640px)] rounded-[32px] bg-white px-6 pt-5 pb-5 shadow-[0_16px_50px_rgba(0,0,0,0.16)]"
    >
      <div className="relative flex items-center justify-center">
        <div className="flex rounded-full bg-pill p-1">
          <ToggleChip active={whenKind === "dates"} onClick={() => onKind("dates")}>
            Dates
          </ToggleChip>
          <ToggleChip active={whenKind === "flexible"} onClick={() => onKind("flexible")}>
            Flexible
          </ToggleChip>
        </div>
        <button type="button" onClick={onClear} className="absolute right-0 text-[13px] text-black/40">
          Clear dates
        </button>
      </div>
      {whenKind === "dates" ? (
        <DatesView
          checkIn={checkIn}
          checkOut={checkOut}
          flexibility={flexibility}
          onDay={onDay}
          onFlexibility={onFlexibility}
        />
      ) : (
        <FlexibleView stay={stay} months={months} onStay={onStay} onToggleMonth={onToggleMonth} />
      )}
    </div>
  );
}

function DatesView({
  checkIn,
  checkOut,
  flexibility,
  onDay,
  onFlexibility,
}: {
  checkIn: string;
  checkOut: string;
  flexibility: DateFlexDays;
  onDay: (iso: string) => void;
  onFlexibility: (days: DateFlexDays) => void;
}) {
  const today = todayIso();
  const minKey = today.slice(0, 7);
  const initial = (checkIn || today).slice(0, 7);
  const [leftKey, setLeftKey] = useState(initial < minKey ? minKey : initial);

  return (
    <>
      <div className="mt-6 grid grid-cols-2 gap-8">
        <MonthGrid
          monthKey={leftKey}
          checkIn={checkIn}
          checkOut={checkOut}
          today={today}
          onDay={onDay}
          onPrev={() => setLeftKey(shiftMonth(leftKey, -1))}
          onNext={() => setLeftKey(shiftMonth(leftKey, 1))}
          prevDisabled={leftKey <= minKey}
          hidePrev={false}
          hideNext
        />
        <MonthGrid
          monthKey={shiftMonth(leftKey, 1)}
          checkIn={checkIn}
          checkOut={checkOut}
          today={today}
          onDay={onDay}
          onPrev={() => setLeftKey(shiftMonth(leftKey, -1))}
          onNext={() => setLeftKey(shiftMonth(leftKey, 1))}
          prevDisabled
          hidePrev
          hideNext={false}
        />
      </div>
      <div className="mt-6 flex justify-center">
        <div className="flex flex-wrap justify-center rounded-full bg-pill p-1">
          {DATE_FLEX_DAYS.map((days) => (
            <ToggleChip key={days} active={flexibility === days} onClick={() => onFlexibility(days)}>
              {flexLabel(days)}
            </ToggleChip>
          ))}
        </div>
      </div>
    </>
  );
}

function FlexibleView({
  stay,
  months,
  onStay,
  onToggleMonth,
}: {
  stay: FlexibleStayLength;
  months: string[];
  onStay: (stay: FlexibleStayLength) => void;
  onToggleMonth: (key: string) => void;
}) {
  const keys = upcomingYearMonths(todayIso(), 12);
  const selected = new Set(months);

  return (
    <div className="mt-8">
      <h2 className="text-[18px] font-semibold tracking-tight">How long would you like to stay?</h2>
      <div className="mt-3 flex w-fit rounded-full bg-pill p-1">
        <ToggleChip active={stay === "weekend"} onClick={() => onStay("weekend")}>
          Weekend
        </ToggleChip>
        <ToggleChip active={stay === "week"} onClick={() => onStay("week")}>
          Week
        </ToggleChip>
      </div>
      <h2 className="mt-8 text-[18px] font-semibold tracking-tight">When do you want to go?</h2>
      <div className="mt-4 grid grid-cols-3 gap-3 sm:grid-cols-6">
        {keys.map((key) => {
          const active = selected.has(key);
          return (
            <button
              key={key}
              type="button"
              onClick={() => onToggleMonth(key)}
              className={`rounded-2xl px-2 py-4 text-center text-[12px] font-medium leading-tight ${
                active
                  ? "bg-white shadow-[0_6px_18px_rgba(0,0,0,0.12)] ring-1 ring-black/15"
                  : "bg-pill text-foreground/80"
              }`}
            >
              {monthTitle(key)}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function MonthGrid({
  monthKey,
  checkIn,
  checkOut,
  today,
  onDay,
  onPrev,
  onNext,
  prevDisabled,
  hidePrev,
  hideNext,
}: {
  monthKey: string;
  checkIn: string;
  checkOut: string;
  today: string;
  onDay: (iso: string) => void;
  onPrev: () => void;
  onNext: () => void;
  prevDisabled: boolean;
  hidePrev: boolean;
  hideNext: boolean;
}) {
  const parsed = parseYearMonth(monthKey);
  if (!parsed) {
    return null;
  }
  const first = new Date(parsed.year, parsed.month - 1, 1, 12);
  const blanks = first.getDay();
  const days = new Date(parsed.year, parsed.month, 0, 12).getDate();
  const cells: Array<number | null> = [...Array(blanks).fill(null), ...Array.from({ length: days }, (_, i) => i + 1)];

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <NavArrow label="Previous month" hidden={hidePrev} disabled={prevDisabled} onClick={onPrev} direction="prev" />
        <h2 className="flex-1 text-center text-[15px] font-semibold">{monthTitle(monthKey)}</h2>
        <NavArrow label="Next month" hidden={hideNext} disabled={false} onClick={onNext} direction="next" />
      </div>
      <div className="grid grid-cols-7 text-center text-[11px] text-black/35">
        {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map((day) => (
          <span key={day} className="py-1">
            {day}
          </span>
        ))}
      </div>
      <div className="grid grid-cols-7 text-center">
        {cells.map((day, index) => {
          if (day === null) {
            return <span key={`blank-${index}`} />;
          }
          const iso = `${yearMonthKey(parsed.year, parsed.month)}-${String(day).padStart(2, "0")}`;
          const past = iso < today;
          const weekend = index % 7 === 0 || index % 7 === 6;
          const selected = iso === checkIn || iso === checkOut;
          const inRange = Boolean(checkIn && checkOut && iso > checkIn && iso < checkOut);
          return (
            <button
              key={iso}
              type="button"
              disabled={past}
              onClick={() => onDay(iso)}
              className={`mx-auto my-0.5 flex h-9 w-9 items-center justify-center rounded-full text-[13px] ${
                selected
                  ? "bg-foreground text-white"
                  : inRange
                    ? "bg-pill"
                    : past
                      ? "text-black/25"
                      : weekend
                        ? "text-black/40"
                        : "text-foreground"
              }`}
            >
              {day}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function NavArrow({
  label,
  hidden,
  disabled,
  onClick,
  direction,
}: {
  label: string;
  hidden: boolean;
  disabled: boolean;
  onClick: () => void;
  direction: "prev" | "next";
}) {
  if (hidden) {
    return <span className="h-8 w-8" />;
  }
  return (
    <button
      type="button"
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className="flex h-8 w-8 items-center justify-center text-foreground disabled:text-black/20"
    >
      {direction === "prev" ? "‹" : "›"}
    </button>
  );
}

function ToggleChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full px-4 py-1.5 text-[13px] font-medium ${
        active ? "bg-white text-foreground shadow-[0_4px_14px_rgba(0,0,0,0.12)]" : "text-black/45"
      }`}
    >
      {children}
    </button>
  );
}

function flexLabel(days: DateFlexDays): string {
  switch (days) {
    case 0:
      return "Exact dates";
    case 1:
      return "±1 day";
    case 2:
      return "±2 days";
    case 3:
      return "±3 days";
    case 7:
      return "±7 days";
    default: {
      const _never: never = days;
      return _never;
    }
  }
}

function monthTitle(key: string): string {
  const parsed = parseYearMonth(key);
  if (!parsed) {
    return key;
  }
  return new Date(parsed.year, parsed.month - 1, 1, 12).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });
}

function shiftMonth(key: string, delta: number): string {
  const parsed = parseYearMonth(key);
  if (!parsed) {
    return key;
  }
  const date = new Date(parsed.year, parsed.month - 1 + delta, 1, 12);
  return yearMonthKey(date.getFullYear(), date.getMonth() + 1);
}
