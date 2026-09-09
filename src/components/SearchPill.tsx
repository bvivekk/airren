"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useRef, useState, type ReactNode } from "react";
import type { DateFlexDays, FlexibleStayLength } from "@/domain/home";
import { defaultStayWindow, windowFromFlexible } from "@/lib/dates";
import { parseStayQuery } from "@/lib/query";
import { SearchWhenPanel } from "@/components/search-when-panel";
import { SearchWherePanel } from "@/components/search-where-panel";
import { SearchWhoPanel } from "@/components/search-who-panel";

type OpenPanel = "where" | "when" | "who";

export function SearchPill({ anchor = false }: { anchor?: boolean }) {
  const params = useSearchParams();
  return <SearchPillFields key={params.toString()} params={params} anchor={anchor} />;
}

function SearchPillFields({
  params,
  anchor,
}: {
  params: ReturnType<typeof useSearchParams>;
  anchor: boolean;
}) {
  const parsed = parseStayQuery({
    where: params.get("where") ?? undefined,
    checkIn: params.get("checkIn") ?? undefined,
    checkOut: params.get("checkOut") ?? undefined,
    who: params.get("who") ?? undefined,
    when: params.get("when") ?? undefined,
    pets: params.get("pets") ?? undefined,
    whenMode: params.get("whenMode") ?? undefined,
    flex: params.get("flex") ?? undefined,
    stay: params.get("stay") ?? undefined,
    months: params.get("months") ?? undefined,
  });
  const defaults = defaultStayWindow();
  const [open, setOpen] = useState<OpenPanel | null>(null);
  const [where, setWhere] = useState(params.get("where") ?? "");
  const [checkIn, setCheckIn] = useState(params.get("checkIn") ?? params.get("when") ?? "");
  const [checkOut, setCheckOut] = useState(params.get("checkOut") ?? "");
  const [flexibility, setFlexibility] = useState<DateFlexDays>(
    parsed.when.kind === "dates" ? parsed.when.flexibility : 0,
  );
  const [whenKind, setWhenKind] = useState<"dates" | "flexible">(parsed.when.kind);
  const [stay, setStay] = useState<FlexibleStayLength>(
    parsed.when.kind === "flexible" ? parsed.when.stay : "weekend",
  );
  const [months, setMonths] = useState<string[]>(parsed.when.kind === "flexible" ? parsed.when.months : []);
  const [guests, setGuests] = useState(params.get("who") === null ? 0 : parsed.guests);
  const [pets, setPets] = useState(parsed.pets);
  const rootRef = useRef<HTMLFormElement>(null);
  const whereInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) {
      return;
    }
    function onPointerDown(event: PointerEvent) {
      if (
        event.target instanceof Node &&
        rootRef.current &&
        !rootRef.current.contains(event.target)
      ) {
        setOpen(null);
      }
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(null);
      }
    }
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  useEffect(() => {
    if (open === "where") {
      whereInputRef.current?.focus();
    }
  }, [open]);

  const resolved =
    whenKind === "flexible"
      ? windowFromFlexible(stay, months)
      : {
          checkIn: checkIn || defaults.checkIn,
          checkOut: checkOut || defaults.checkOut,
        };

  function toggle(panel: OpenPanel) {
    setOpen((current) => (current === panel ? null : panel));
  }

  function pickDay(iso: string) {
    if (!checkIn || (checkIn && checkOut)) {
      setCheckIn(iso);
      setCheckOut("");
      return;
    }
    if (iso < checkIn) {
      setCheckIn(iso);
      return;
    }
    setCheckOut(iso);
  }

  function clearWhen() {
    setCheckIn("");
    setCheckOut("");
    setFlexibility(0);
    setMonths([]);
  }

  function toggleMonth(key: string) {
    setMonths((current) =>
      current.includes(key) ? current.filter((item) => item !== key) : [...current, key],
    );
  }

  return (
    <form
      ref={rootRef}
      id={anchor ? "search" : undefined}
      action="/search"
      method="get"
      className="relative w-full max-w-[820px]"
    >
      <div
        className={`flex h-14 w-full items-stretch rounded-full p-1.5 ${
          open ? "bg-pill" : "bg-white shadow-[0_8px_30px_rgba(0,0,0,0.12)]"
        }`}
      >
        <Segment
          active={open === "where"}
          onClick={() => toggle("where")}
          label="Where"
          value={where}
          icon={<SearchIcon />}
        />
        <Divider hidden={open === "where" || open === "when"} />
        <Segment
          active={open === "when"}
          onClick={() => toggle("when")}
          label="When"
          value={whenSummary({ whenKind, checkIn, checkOut, stay, months })}
        />
        <Divider hidden={open === "when" || open === "who"} />
        <Segment
          active={open === "who"}
          onClick={() => toggle("who")}
          label="Who"
          value={whoSummary(guests, pets)}
        />
        <button
          type="submit"
          className="my-auto mr-0.5 rounded-full bg-foreground px-5 py-2.5 text-[13px] font-medium text-white"
        >
          Search
        </button>
      </div>
      {open === "where" ? (
        <SearchWherePanel where={where} onWhere={setWhere} inputRef={whereInputRef} />
      ) : null}
      {open === "when" ? (
        <SearchWhenPanel
          whenKind={whenKind}
          checkIn={checkIn}
          checkOut={checkOut}
          flexibility={flexibility}
          stay={stay}
          months={months}
          onKind={setWhenKind}
          onClear={clearWhen}
          onDay={pickDay}
          onFlexibility={setFlexibility}
          onStay={setStay}
          onToggleMonth={toggleMonth}
        />
      ) : null}
      {open === "who" ? (
        <SearchWhoPanel guests={guests} pets={pets} onGuests={setGuests} onPets={setPets} />
      ) : null}
      <input type="hidden" name="where" value={where} />
      <input type="hidden" name="checkIn" value={resolved.checkIn} />
      <input type="hidden" name="checkOut" value={resolved.checkOut} />
      <input type="hidden" name="who" value={String(guests)} />
      <input type="hidden" name="pets" value={String(pets)} />
      <input type="hidden" name="whenMode" value={whenKind} />
      <input type="hidden" name="flex" value={String(flexibility)} />
      {whenKind === "flexible" ? <input type="hidden" name="stay" value={stay} /> : null}
      {whenKind === "flexible" ? <input type="hidden" name="months" value={months.join(",")} /> : null}
    </form>
  );
}

function Segment({
  active,
  onClick,
  label,
  value,
  icon,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  value: string;
  icon?: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-expanded={active}
      aria-label={label}
      className={`flex min-w-0 flex-1 items-center gap-2 rounded-full px-5 text-left text-[13px] font-medium ${
        active ? "bg-white text-foreground shadow-[0_6px_20px_rgba(0,0,0,0.12)]" : "text-foreground/80"
      }`}
    >
      {icon}
      <span className="truncate">{value || label}</span>
    </button>
  );
}

function Divider({ hidden }: { hidden: boolean }) {
  if (hidden) {
    return null;
  }
  return <span className="my-auto h-6 w-px bg-black/10" aria-hidden="true" />;
}

function SearchIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="11" cy="11" r="6.2" stroke="currentColor" strokeWidth="1.7" />
      <path d="M16 16.5 20 20.5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  );
}

function formatPillDate(iso: string): string {
  const date = new Date(`${iso}T12:00:00`);
  if (!Number.isFinite(date.getTime())) {
    return iso;
  }
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function whenSummary({
  whenKind,
  checkIn,
  checkOut,
  stay,
  months,
}: {
  whenKind: "dates" | "flexible";
  checkIn: string;
  checkOut: string;
  stay: FlexibleStayLength;
  months: string[];
}): string {
  if (whenKind === "flexible") {
    const first = months[0];
    const length = stay === "week" ? "Week" : "Weekend";
    if (!first) {
      return "";
    }
    const date = new Date(`${first}-01T12:00:00`);
    const month = date.toLocaleDateString("en-US", { month: "short" });
    return `${length} · ${month}`;
  }
  if (!checkIn) {
    return "";
  }
  if (!checkOut) {
    return formatPillDate(checkIn);
  }
  return `${formatPillDate(checkIn)} – ${formatPillDate(checkOut)}`;
}

function whoSummary(guests: number, pets: number): string {
  if (guests < 1 && pets < 1) {
    return "";
  }
  const guestPart = guests < 1 ? "Any guests" : `${guests} ${guests === 1 ? "guest" : "guests"}`;
  if (pets < 1) {
    return guestPart;
  }
  return `${guestPart}, ${pets} ${pets === 1 ? "pet" : "pets"}`;
}
