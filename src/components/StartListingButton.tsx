"use client";

import { useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useChrome } from "@/components/ChromeProvider";
import { startListingDraft } from "@/lib/host-listings-repo";
import { useSupabaseClient } from "@/lib/supabase/browser";

export function StartListingButton({
  label = "List on Airren",
  compact = false,
}: {
  label?: string;
  compact?: boolean;
}) {
  const { isSignedIn } = useUser();
  const { setSignInOpen } = useChrome();
  const supabase = useSupabaseClient();
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  return (
    <div className={compact ? "flex flex-col items-end gap-2" : "mx-auto flex w-full max-w-md flex-col gap-3"}>
      <button
        type="button"
        disabled={pending}
        className={
          compact
            ? "rounded-full bg-foreground px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
            : "rounded-full bg-foreground py-3 text-sm font-medium text-white disabled:opacity-60"
        }
        onClick={() => {
          if (!isSignedIn) {
            setSignInOpen(true);
            return;
          }
          void (async () => {
            setPending(true);
            setError("");
            try {
              const { listing } = await startListingDraft(supabase);
              router.push(`/host/listings/${listing.id}`);
            } catch (startError) {
              setError(startError instanceof Error ? startError.message : "Could not start a listing.");
            } finally {
              setPending(false);
            }
          })();
        }}
      >
        {label}
      </button>
      {error ? <p className={`text-sm text-muted ${compact ? "text-right" : "text-center"}`}>{error}</p> : null}
    </div>
  );
}
