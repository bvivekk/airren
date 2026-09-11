import "@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { requireClerkUser } from "../_shared/clerk.ts";
import { corsHeaders, jsonResponse } from "../_shared/http.ts";
import { createDestination, parseSavePayoutAccountRequest } from "../_shared/razorpayx.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return jsonResponse({ error: "method not allowed" }, 405);
  }

  try {
    const identity = await requireClerkUser(req);
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !serviceKey) {
      return jsonResponse({ error: "supabase is not configured" }, 500);
    }
    if (!Deno.env.get("RAZORPAYX_KEY_ID") || !Deno.env.get("RAZORPAYX_KEY_SECRET")) {
      return jsonResponse({ error: "RAZORPAYX_KEY_ID and RAZORPAYX_KEY_SECRET are not configured" }, 500);
    }

    const destination = await createDestination(identity.sub, parseSavePayoutAccountRequest(await req.json()));

    const admin = createClient(supabaseUrl, serviceKey);
    const updatedAt = new Date().toISOString();
    const { error: upsertError } = await admin.from("host_payout_accounts").upsert({
      host_id: identity.sub,
      method: destination.method,
      label: destination.label,
      razorpayx_contact_id: destination.contactId,
      razorpayx_fund_account_id: destination.fundAccountId,
      updated_at: updatedAt,
    });
    if (upsertError) {
      console.error("save-payout-account upsert", upsertError.message);
      return jsonResponse({ error: upsertError.message }, 400);
    }

    const { error: releaseError } = await admin.rpc("release_no_destination_holds", {
      p_host_id: identity.sub,
    });
    if (releaseError) {
      console.error("save-payout-account release", releaseError.message);
      return jsonResponse({ error: releaseError.message }, 400);
    }

    return jsonResponse({
      method: destination.method,
      label: destination.label,
      updatedAt,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "could not save payout account";
    console.error("save-payout-account", message);
    const status = message.includes("signed in") ? 401 : 400;
    return jsonResponse({ error: message }, status);
  }
});
