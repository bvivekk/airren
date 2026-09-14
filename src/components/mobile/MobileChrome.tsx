"use client";

import { useClerk, useUser } from "@clerk/nextjs";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { useChrome } from "@/components/ChromeProvider";
import { LogoWordmark } from "@/components/Logo";

const ALWAYS_ITEMS = [
  { href: "/download", label: "Download mobile app" },
  { href: "/list", label: "List on Airren" },
  { href: "/os", label: "Get AirrenOS" },
  { href: "/help", label: "Visit help center" },
] as const;

type TabId = "explore" | "wishlists" | "trips" | "profile";

export function MobileChrome() {
  const pathname = usePathname();
  const router = useRouter();
  const { setSignInOpen } = useChrome();
  const { user, isSignedIn } = useUser();
  const { signOut } = useClerk();
  const [profileOpen, setProfileOpen] = useState(false);
  const active = resolveActiveTab(pathname, profileOpen);
  const showTopBar = pathname !== "/";

  return (
    <div className="md:hidden">
      {showTopBar ? (
        <>
          <header className="fixed top-0 right-0 left-0 z-[110] flex h-12 items-center border-b border-line bg-white px-4">
            <Link href="/" aria-label="Back to explore" className="flex items-center gap-2 text-foreground">
              <BackMark />
              <LogoWordmark />
            </Link>
          </header>
          <div aria-hidden="true" className="h-12" />
        </>
      ) : null}
      {profileOpen ? (
        <div className="fixed inset-0 z-[140]">
          <button
            type="button"
            className="absolute inset-0 bg-black/20"
            aria-label="Close profile"
            onClick={() => setProfileOpen(false)}
          />
          <div className="absolute right-0 bottom-[calc(var(--tab-bar-height)+env(safe-area-inset-bottom,0px))] left-0 rounded-t-2xl bg-white p-3 shadow-[0_-12px_40px_rgba(0,0,0,0.16)]">
            <nav className="flex flex-col pb-2">
              {isSignedIn && user ? (
                <>
                  <p className="rounded-lg px-3 py-2.5 text-[15px] font-semibold">
                    Signed in as {signedInLabel(user)}
                  </p>
                  <Link
                    href="/bookings"
                    className="rounded-lg px-3 py-2.5 text-[15px] text-foreground"
                    onClick={() => setProfileOpen(false)}
                  >
                    My trips
                  </Link>
                  <Link
                    href="/host/listings"
                    className="rounded-lg px-3 py-2.5 text-[15px] text-foreground"
                    onClick={() => setProfileOpen(false)}
                  >
                    Your listings
                  </Link>
                  <Link
                    href="/host/earnings"
                    className="rounded-lg px-3 py-2.5 text-[15px] text-foreground"
                    onClick={() => setProfileOpen(false)}
                  >
                    Earnings
                  </Link>
                  <button
                    type="button"
                    className="rounded-lg px-3 py-2.5 text-left text-[15px] font-semibold"
                    onClick={() => {
                      setProfileOpen(false);
                      void signOut();
                    }}
                  >
                    Sign out
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  className="rounded-lg px-3 py-2.5 text-left text-[15px] font-semibold"
                  onClick={() => {
                    setProfileOpen(false);
                    setSignInOpen(true);
                  }}
                >
                  Sign in or sign up
                </button>
              )}
              {ALWAYS_ITEMS.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="rounded-lg px-3 py-2.5 text-[15px] text-foreground"
                  onClick={() => setProfileOpen(false)}
                >
                  {item.label}
                </Link>
              ))}
            </nav>
          </div>
        </div>
      ) : null}
      <nav
        aria-label="Mobile"
        className="fixed right-0 bottom-0 left-0 z-[150] grid grid-cols-4 border-t border-line bg-white pt-1"
        style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)", height: "calc(var(--tab-bar-height) + env(safe-area-inset-bottom, 0px))" }}
      >
        <TabLink href="/" label="Explore" active={active === "explore"} icon="explore" />
        <TabLink href="/wishlists" label="Wishlists" active={active === "wishlists"} icon="wishlists" />
        <button
          type="button"
          className={tabClass(active === "trips")}
          onClick={() => {
            if (isSignedIn) {
              router.push("/bookings");
              return;
            }
            setSignInOpen(true);
          }}
        >
          <TabIcon name="trips" />
          Trips
        </button>
        <button type="button" className={tabClass(active === "profile")} onClick={() => setProfileOpen((open) => !open)}>
          <TabIcon name="profile" />
          Profile
        </button>
      </nav>
    </div>
  );
}

function resolveActiveTab(pathname: string, profileOpen: boolean): TabId | null {
  if (profileOpen) {
    return "profile";
  }
  if (
    pathname === "/" ||
    pathname === "/search" ||
    pathname.startsWith("/search/") ||
    pathname.startsWith("/homes/") ||
    pathname.startsWith("/c/")
  ) {
    return "explore";
  }
  if (pathname === "/wishlists") {
    return "wishlists";
  }
  if (pathname === "/bookings" || pathname.startsWith("/bookings/")) {
    return "trips";
  }
  return null;
}

function TabLink({
  href,
  label,
  active,
  icon,
}: {
  href: "/" | "/wishlists";
  label: string;
  active: boolean;
  icon: "explore" | "wishlists";
}) {
  return (
    <Link href={href} className={tabClass(active)}>
      <TabIcon name={icon} />
      {label}
    </Link>
  );
}

function tabClass(active: boolean): string {
  return `flex flex-col items-center justify-center gap-0.5 text-[11px] font-medium ${
    active ? "text-nav-active" : "text-muted"
  }`;
}

function TabIcon({ name }: { name: Exclude<TabId, "profile"> | "profile" }) {
  switch (name) {
    case "explore":
      return (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <circle cx="11" cy="11" r="6.25" stroke="currentColor" strokeWidth="1.7" />
          <path d="M16 16 20.5 20.5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
        </svg>
      );
    case "wishlists":
      return (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path
            d="M12 20s-7.2-4.6-9.2-9C.8 7.4 2.2 4.6 5.2 4.6c1.8 0 3 .9 3.8 2.1.8-1.2 2-2.1 3.8-2.1 3 0 4.4 2.8 2.8 6.4C19.2 15.4 12 20 12 20Z"
            stroke="currentColor"
            strokeWidth="1.6"
          />
        </svg>
      );
    case "trips":
      return (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path
            d="M4 18V8.5L12 4l8 4.5V18"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinejoin="round"
          />
          <path d="M9 18v-5h6v5" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
        </svg>
      );
    case "profile":
      return (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <circle cx="12" cy="9" r="3.2" stroke="currentColor" strokeWidth="1.6" />
          <path d="M5.5 19c1.2-3 3.4-4.4 6.5-4.4s5.3 1.4 6.5 4.4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
        </svg>
      );
    default: {
      const _never: never = name;
      return _never;
    }
  }
}

function BackMark() {
  return (
    <svg width="18" height="18" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path d="M10 3 5 8l5 5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function signedInLabel(user: NonNullable<ReturnType<typeof useUser>["user"]>): string {
  return user.firstName ?? user.primaryEmailAddress?.emailAddress ?? user.primaryPhoneNumber?.phoneNumber ?? "Guest";
}
