"use client";

import { useState } from "react";
import { useChrome } from "@/components/ChromeProvider";

export function SignInModal() {
  const { signInOpen, setSignInOpen, setName, name } = useChrome();
  const [draft, setDraft] = useState(name ?? "");
  if (!signInOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <button
        type="button"
        className="absolute inset-0 bg-black/30"
        aria-label="Close sign in"
        onClick={() => setSignInOpen(false)}
      />
      <form
        className="relative w-full max-w-sm rounded-3xl bg-white p-6 shadow-xl"
        onSubmit={(event) => {
          event.preventDefault();
          const next = draft.trim();
          if (next) {
            setName(next);
          }
          setSignInOpen(false);
        }}
      >
        <h2 className="text-xl font-semibold">Sign in or sign up</h2>
        <p className="mt-2 text-sm text-muted">Demo session only. A name is stored in this browser. No password vendor.</p>
        <label className="mt-5 block text-sm font-medium">
          Name
          <input
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            className="mt-2 w-full rounded-full border border-line px-4 py-2.5 text-sm outline-none"
            placeholder="Your name"
            autoFocus
          />
        </label>
        <button
          type="submit"
          className="mt-5 w-full rounded-full bg-foreground py-3 text-sm font-medium text-white"
        >
          Continue
        </button>
      </form>
    </div>
  );
}
