import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { auth } from "@clerk/nextjs/server";
import { clerkSupabaseJwtTemplate } from "@/lib/clerk-supabase";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabasePublishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

function requirePublicEnv() {
  if (!supabaseUrl || !supabasePublishableKey) {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY must be set");
  }
  return { supabaseUrl, supabasePublishableKey };
}

export function createPublicClient(): SupabaseClient {
  const env = requirePublicEnv();
  return createClient(env.supabaseUrl, env.supabasePublishableKey);
}

export function createServerClient(): SupabaseClient {
  const env = requirePublicEnv();
  return createClient(env.supabaseUrl, env.supabasePublishableKey, {
    accessToken: async () => {
      const session = await auth();
      return (await session.getToken({ template: clerkSupabaseJwtTemplate })) ?? null;
    },
  });
}
