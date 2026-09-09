"use client";

import { useUser } from "@clerk/nextjs";
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
  const { setMenuOpen } = useChrome();
  const { user } = useUser();
  const displayName = user?.firstName ?? user?.primaryEmailAddress?.emailAddress ?? user?.primaryPhoneNumber?.phoneNumber ?? null;
  const search = showSearch(pathname);

  return (
    <>
      <header
        data-slot="header"
        data-theme={overlay ? "dark" : "light"}
        style={overlayPage ? { position: "fixed", top: 16 } : { position: "fixed", top: 0 }}
        className={`fixed z-[100] overflow-visible flex h-[72px] items-center border transition-[background-color,border-color,box-shadow] duration-200 ${
          overlayPage ? "top-4 right-4 left-4 w-auto rounded-2xl" : "top-0 left-0 w-full"
        } ${
          overlay
            ? "border-transparent bg-transparent text-white shadow-none"
            : overlayPage
              ? "border-line bg-white text-foreground shadow-[0_8px_30px_rgba(0,0,0,0.08)]"
              : "border-line bg-white text-foreground"
        }`}
      >
        <div className="page-container flex w-full items-center justify-between gap-4">
          <Link href="/" className="shrink-0" aria-label="Airren home">
            <LogoWordmark light={overlay} />
          </Link>
          {search ? (
            <div className="flex min-w-0 flex-1 justify-center overflow-visible">
              <Suspense fallback={<div className="h-12 w-full max-w-[720px] rounded-full bg-white" />}>
                <SearchPill anchor />
              </Suspense>
            </div>
          ) : (
            <div className="flex-1" />
          )}
          <div className="flex shrink-0 items-center gap-3">
            {displayName ? (
              <span className={`hidden text-[13px] sm:inline ${overlay ? "text-white/80" : "text-muted"}`}>
                {displayName}
              </span>
            ) : null}
            <Link
              href="/list"
              className={`hidden rounded-full border px-4 py-2 text-[13px] font-medium sm:inline-flex ${
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
