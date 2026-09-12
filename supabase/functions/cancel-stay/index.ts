import "@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { requireClerkUser } from "../_shared/clerk.ts";
import { corsHeaders, jsonResponse } from "../_shared/http.ts";

type CancelBody = {
  bookingId?: string;
};

function statusForCancelError(message: string): number {
  switch (message) {
    case "signed in guest required":
      return 401;
    case "forbidden":
      return 403;
    case "not_found":
      return 404;
    case "not_confirmed":
    case "window_closed":
    case "payout_in_flight":
    case "no_payment":
      return 409;
    default:
      return 400;
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return jsonResponse({ error: "method not allowed" }, 405);
  }

  try {
    const identity = await requireClerkUser(req);
    const body = (await req.json()) as CancelBody;
    const bookingId = body.bookingId ?? "";
    if (!bookingId) {
      return jsonResponse({ error: "booking is required" }, 400);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseKey = Deno.env.get("SUPABASE_ANON_KEY") ?? Deno.env.get("SUPABASE_PUBLISHABLE_KEY");
    if (!supabaseUrl || !supabaseKey) {
      return jsonResponse({ error: "supabase is not configured" }, 500);
    }

    const supabase = createClient(supabaseUrl, supabaseKey, {
      accessToken: async () => identity.token,
    });

    const { data, error } = await supabase.rpc("cancel_booking", {
      p_booking_id: bookingId,
    });
    if (error) {
      console.error("cancel_booking", error.message);
      return jsonResponse({ error: error.message }, statusForCancelError(error.message));
    }
    return jsonResponse(data);
  } catch (error) {
    const message = error instanceof Error ? error.message : "cancel failed";
    console.error("cancel-stay failed", message);
    return jsonResponse({ error: message }, statusForCancelError(message));
  }
});
