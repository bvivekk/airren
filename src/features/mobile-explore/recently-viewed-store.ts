"use client";

import { useEffect, useMemo, useSyncExternalStore } from "react";

const KEY = "airren-recently-viewed";
const CAP = 12;
const EMPTY_SNAPSHOT = "[]";

function subscribe(onStoreChange: () => void) {
  window.addEventListener("storage", onStoreChange);
  window.addEventListener("airren-store", onStoreChange);
  return () => {
    window.removeEventListener("storage", onStoreChange);
    window.removeEventListener("airren-store", onStoreChange);
  };
}

function emit() {
  window.dispatchEvent(new Event("airren-store"));
}

function readRaw(): string {
  return window.localStorage.getItem(KEY) ?? EMPTY_SNAPSHOT;
}

function parseSlugs(raw: string): string[] {
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return [];
    }
    return parsed.filter((item): item is string => typeof item === "string" && item !== "");
  } catch {
    return [];
  }
}

export function readRecentlyViewedSlugs(): string[] {
  if (typeof window === "undefined") {
    return [];
  }
  return parseSlugs(readRaw());
}

export function rememberViewedHome(slug: string): void {
  if (typeof window === "undefined" || slug === "") {
    return;
  }
  const next = [slug, ...readRecentlyViewedSlugs().filter((item) => item !== slug)].slice(0, CAP);
  window.localStorage.setItem(KEY, JSON.stringify(next));
  emit();
}

function getServerSnapshot(): string {
  return EMPTY_SNAPSHOT;
}

export function useRecentlyViewed(): readonly string[] {
  const raw = useSyncExternalStore(subscribe, readRaw, getServerSnapshot);
  return useMemo(() => parseSlugs(raw), [raw]);
}

export function HomeViewTracker({ slug }: { slug: string }) {
  useEffect(() => {
    rememberViewedHome(slug);
  }, [slug]);
  return null;
}
