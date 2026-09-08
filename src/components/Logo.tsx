export function LogoMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 32 32"
      className={className}
      aria-hidden="true"
      fill="none"
    >
      <circle cx="16" cy="16" r="14.5" stroke="currentColor" strokeWidth="1.5" />
      <path
        d="M6 19.5c3.2-2.4 6.8-3.6 10-3.6s6.8 1.2 10 3.6"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <circle cx="16" cy="12" r="2.2" fill="currentColor" />
    </svg>
  );
}

export function LogoWordmark({ light }: { light?: boolean }) {
  return (
    <span className={`inline-flex items-center gap-2 ${light ? "text-white" : "text-foreground"}`}>
      <LogoMark className="h-7 w-7" />
      <span className="text-[17px] font-semibold tracking-tight">Airren</span>
    </span>
  );
}
