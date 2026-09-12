"use client";

import { useClerk, useUser } from "@clerk/nextjs";
import Link from "next/link";
import { useChrome } from "@/components/ChromeProvider";

const ITEMS = [
  { href: "/download", label: "Download mobile app" },
  { href: "/list", label: "List on Airren" },
  { href: "/os", label: "Get AirrenOS" },
  { href: "/help", label: "Visit help center" },
];

function guestLabel(user: NonNullable<ReturnType<typeof useUser>["user"]>): string {
  return user.firstName ?? user.primaryEmailAddress?.emailAddress ?? user.primaryPhoneNumber?.phoneNumber ?? "Guest";
}

export function MenuDrawer() {
  const { menuOpen, setMenuOpen, setSignInOpen } = useChrome();
  const { user, isSignedIn } = useUser();
  const { signOut } = useClerk();
  if (!menuOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50">
      <button
        type="button"
        className="absolute inset-0 bg-black/20"
        aria-label="Close menu"
        onClick={() => setMenuOpen(false)}
      />
      <div className="absolute right-5 top-16 w-[280px] rounded-2xl bg-white p-3 shadow-[0_20px_60px_rgba(0,0,0,0.18)]">
        <div className="mb-1 flex justify-end">
          <button
            type="button"
            aria-label="Close menu"
            className="flex h-8 w-8 items-center justify-center rounded-full text-foreground"
            onClick={() => setMenuOpen(false)}
          >
            <span className="text-xl leading-none">×</span>
          </button>
        </div>
        <nav className="flex flex-col">
          {isSignedIn && user ? (
            <>
              <p className="rounded-lg px-3 py-2.5 text-[15px] font-semibold">Signed in as {guestLabel(user)}</p>
              <Link
                href="/bookings"
                className="rounded-lg px-3 py-2.5 text-[15px] text-foreground"
                onClick={() => setMenuOpen(false)}
              >
                My trips
              </Link>
              <Link
                href="/host/listings"
                className="rounded-lg px-3 py-2.5 text-[15px] text-foreground"
                onClick={() => setMenuOpen(false)}
              >
                Your listings
              </Link>
              <Link
                href="/host/earnings"
                className="rounded-lg px-3 py-2.5 text-[15px] text-foreground"
                onClick={() => setMenuOpen(false)}
              >
                Earnings
              </Link>
              <button
                type="button"
                className="rounded-lg px-3 py-2.5 text-left text-[15px] font-semibold"
                onClick={() => {
                  setMenuOpen(false);
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
                setMenuOpen(false);
                setSignInOpen(true);
              }}
            >
              Sign in or sign up
            </button>
          )}
          {ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="rounded-lg px-3 py-2.5 text-[15px] text-foreground"
              onClick={() => setMenuOpen(false)}
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </div>
    </div>
  );
}
