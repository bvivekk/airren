"use client";

import { useUser } from "@clerk/nextjs";
import { useState } from "react";
import { useSupabaseClient } from "@/lib/supabase/browser";

export function ListApplyForm() {
  const { user } = useUser();
  const supabase = useSupabaseClient();
  const [done, setDone] = useState(false);
  const [url, setUrl] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  if (done) {
    return (
      <p className="rounded-3xl bg-white px-6 py-8 text-center text-sm">
        Application received. We will review the home.
      </p>
    );
  }

  return (
    <form
      className="mx-auto flex w-full max-w-md flex-col gap-3"
      onSubmit={(event) => {
        event.preventDefault();
        void (async () => {
          setPending(true);
          setError("");
          const { error: insertError } = await supabase.from("listing_applications").insert({
            listing_url: url.trim(),
            guest_id: user?.id ?? null,
          });
          setPending(false);
          if (insertError) {
            setError("Could not save the application. Try again.");
            return;
          }
          setDone(true);
        })();
      }}
    >
      <input
        required
        value={url}
        onChange={(event) => setUrl(event.target.value)}
        placeholder="Airbnb, Vrbo, or site URL"
        className="rounded-full border border-line bg-white px-5 py-3 text-sm outline-none"
      />
      {error ? <p className="text-center text-sm text-muted">{error}</p> : null}
      <button
        type="submit"
        disabled={pending}
        className="rounded-full bg-foreground py-3 text-sm font-medium text-white disabled:opacity-60"
      >
        List on Airren
      </button>
    </form>
  );
}
