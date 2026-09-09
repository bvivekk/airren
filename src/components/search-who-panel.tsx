export function SearchWhoPanel({
  guests,
  pets,
  onGuests,
  onPets,
}: {
  guests: number;
  pets: number;
  onGuests: (value: number) => void;
  onPets: (value: number) => void;
}) {
  return (
    <div
      role="dialog"
      aria-label="Who"
      className="absolute top-[calc(100%+10px)] right-0 z-20 w-[min(100vw-2rem,380px)] rounded-[32px] bg-white px-6 py-2 shadow-[0_16px_50px_rgba(0,0,0,0.16)]"
    >
      <StepperRow label="Guests" value={guests} max={16} onChange={onGuests} />
      <div className="h-px bg-black/8" />
      <StepperRow label="Pets" value={pets} max={8} onChange={onPets} />
    </div>
  );
}

function StepperRow({
  label,
  value,
  max,
  onChange,
}: {
  label: string;
  value: number;
  max: number;
  onChange: (value: number) => void;
}) {
  return (
    <div className="flex items-center justify-between py-5">
      <span className="text-[15px] font-medium">{label}</span>
      <div className="flex items-center gap-3">
        <CircleButton
          label={`Fewer ${label.toLowerCase()}`}
          disabled={value <= 0}
          onClick={() => onChange(value - 1)}
        >
          −
        </CircleButton>
        <span className="w-10 text-center text-[14px]">{value < 1 ? "Any" : value}</span>
        <CircleButton
          label={`More ${label.toLowerCase()}`}
          disabled={value >= max}
          onClick={() => onChange(value + 1)}
        >
          +
        </CircleButton>
      </div>
    </div>
  );
}

function CircleButton({
  label,
  disabled,
  onClick,
  children,
}: {
  label: string;
  disabled: boolean;
  onClick: () => void;
  children: string;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className="flex h-8 w-8 items-center justify-center rounded-full border border-black/12 text-[18px] leading-none text-black/45 disabled:opacity-30"
    >
      {children}
    </button>
  );
}
