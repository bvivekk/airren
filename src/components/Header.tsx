"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Suspense, useSyncExternalStore } from "react";
import { LogoWordmark } from "@/components/Logo";
import { SearchPill } from "@/components/SearchPill";
import { useChrome } from "@/components/ChromeProvider";

function showSearch(pathname: string): boolean {
  return pathname === "/" || pathname.startsWith("/search") || pathname.startsWith("/homes") || pathname.startsWith("/c");
}

function subscribeScroll(onStoreChange: () => void) {
  window.addEventListener("scroll", onStoreChange, { passive: true });
  return () => window.removeEventListener("scroll", onStoreChange);
}

function scrollPastHero(): boolean {
  return window.scrollY > 24;
}

export function Header() {
  const pathname = usePathname();
  const overlayPage = pathname === "/";
  const scrolled = useSyncExternalStore(subscribeScroll, scrollPastHero, () => false);
  const overlay = overlayPage && !scrolled;
  const { setMenuOpen, name } = useChrome();
  const search = showSearch(pathname);

  return (
    <>
      <header
        data-slot="header"
        data-theme={overlay ? "dark" : "light"}
        className={`fixed top-0 left-0 z-50 flex h-[72px] w-full items-center overflow-hidden border-b transition-[background-color,border-color] duration-200 ${
          overlay
            ? "border-transparent bg-transparent text-white"
            : "border-line bg-white text-foreground"
        }`}
      >
        <div className="page-container flex w-full items-center justify-between gap-4">
          <Link href="/" className="shrink-0" aria-label="Airren home">
            <LogoWordmark light={overlay} />
          </Link>
          {search ? (
            <div className="hidden min-w-0 flex-1 justify-center lg:flex">
              <Suspense fallback={<div className="h-12 w-full max-w-[720px] rounded-full bg-white" />}>
                <SearchPill anchor />
              </Suspense>
            </div>
          ) : (
            <div className="flex-1" />
          )}
          <div className="flex shrink-0 items-center gap-3">
            {name ? (
              <span className={`hidden text-[13px] sm:inline ${overlay ? "text-white/80" : "text-muted"}`}>
                {name}
              </span>
            ) : null}
            <Link
              href="/list"
              className={`rounded-full border px-4 py-2 text-[13px] font-medium ${
                overlay ? "border-white/35 bg-transparent text-white" : "border-black/10 bg-white text-foreground"
              }`}
            >
              List on Airren
            </Link>
            <button
              type="button"
              aria-label="Open menu"
              className="flex h-10 w-10 items-center justify-center"
              onClick={() => setMenuOpen(true)}
            >
              <svg width="22" height="16" viewBox="0 0 22 16" fill="none" aria-hidden="true">
                <path d="M1 1.5h20M1 8h20M1 14.5h20" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
              </svg>
            </button>
          </div>
        </div>
      </header>
      {overlayPage ? null : <div aria-hidden="true" className="h-[72px]" />}
    </>
  );
}
