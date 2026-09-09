"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";

const FAVORITES_KEY = "airren-favorites";

type ChromeContextValue = {
  menuOpen: boolean;
  setMenuOpen: (open: boolean) => void;
  signInOpen: boolean;
  setSignInOpen: (open: boolean) => void;
  favorites: ReadonlySet<string>;
  toggleFavorite: (slug: string) => void;
};

const ChromeContext = createContext<ChromeContextValue | null>(null);

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

function readFavorites(): string {
  return window.localStorage.getItem(FAVORITES_KEY) ?? "[]";
}

function parseFavorites(raw: string): Set<string> {
  try {
    const parsed: unknown = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return new Set(parsed.filter((item) => typeof item === "string"));
    }
  } catch {
    return new Set();
  }
  return new Set();
}

export function ChromeProvider({ children }: { children: ReactNode }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [signInOpen, setSignInOpen] = useState(false);
  const favoritesRaw = useSyncExternalStore(subscribe, readFavorites, () => "[]");
  const favorites = useMemo(() => parseFavorites(favoritesRaw), [favoritesRaw]);

  const toggleFavorite = useCallback((slug: string) => {
    const next = parseFavorites(readFavorites());
    if (next.has(slug)) {
      next.delete(slug);
    } else {
      next.add(slug);
    }
    window.localStorage.setItem(FAVORITES_KEY, JSON.stringify([...next]));
    emit();
  }, []);

  const value = useMemo(
    () => ({
      menuOpen,
      setMenuOpen,
      signInOpen,
      setSignInOpen,
      favorites,
      toggleFavorite,
    }),
    [menuOpen, signInOpen, favorites, toggleFavorite],
  );

  return <ChromeContext.Provider value={value}>{children}</ChromeContext.Provider>;
}

export function useChrome(): ChromeContextValue {
  const value = useContext(ChromeContext);
  if (!value) {
    throw new Error("useChrome must be used under ChromeProvider");
  }
  return value;
}
