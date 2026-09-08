"use client";

import { useSession } from "@clerk/nextjs";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { useMemo } from "react";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabasePublishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

function requirePublicEnv() {
  if (!supabaseUrl || !supabasePublishableKey) {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY must be set");
  }
  return { supabaseUrl, supabasePublishableKey };
}

export function createBrowserClient(getToken: () => Promise<string | null>): SupabaseClient {
  const env = requirePublicEnv();
  return createClient(env.supabaseUrl, env.supabasePublishableKey, {
    accessToken: async () => (await getToken()) ?? null,
  });
}

export function useSupabaseClient(): SupabaseClient {
  const { session } = useSession();
  return useMemo(
    () =>
      createBrowserClient(async () => {
        if (!session) {
          return null;
        }
        return (await session.getToken()) ?? null;
      }),
    [session],
  );
}
