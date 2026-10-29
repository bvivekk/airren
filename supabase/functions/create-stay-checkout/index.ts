import "@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { requireClerkUser } from "../_shared/clerk.ts";
import { corsHeaders, jsonResponse } from "../_shared/http.ts";
import { razorpayKeyAllowed } from "../_shared/razorpay-mode.ts";

type CheckoutBody = {
  homeId?: string;
  checkIn?: string;
  checkOut?: string;
  guests?: number;
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return jsonResponse({ error: "method not allowed" }, 405);
  }

  try {
    const identity = await requireClerkUser(req);
    const body = (await req.json()) as CheckoutBody;
    const homeId = body.homeId ?? "";
    const checkIn = body.checkIn ?? "";
    const checkOut = body.checkOut ?? "";
    const guests = body.guests ?? 0;
    if (!homeId || !checkIn || !checkOut || guests < 1) {
      return jsonResponse({ error: "home, dates, and guests are required" }, 400);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseKey = Deno.env.get("SUPABASE_ANON_KEY") ?? Deno.env.get("SUPABASE_PUBLISHABLE_KEY");
    const razorpayKeyId = Deno.env.get("RAZORPAY_KEY_ID");
    const razorpayKeySecret = Deno.env.get("RAZORPAY_KEY_SECRET");
    if (!supabaseUrl || !supabaseKey) {
      return jsonResponse({ error: "supabase is not configured" }, 500);
    }
    const razorpayMode = Deno.env.get("RAZORPAY_MODE") ?? "";
    if (!razorpayKeyId || !razorpayKeySecret || !razorpayKeyAllowed(razorpayKeyId, razorpayMode)) {
      return jsonResponse({ error: "razorpay is not configured" }, 500);
    }

    const supabase = createClient(supabaseUrl, supabaseKey, {
      accessToken: async () => identity.token,
    });

    const { data: home, error: homeError } = await supabase
      .from("homes")
      .select("id, nightly_rate_paise, guests")
      .eq("id", homeId)
      .eq("status", "published")
      .maybeSingle();
    if (homeError) {
      console.error("checkout home", homeError.message);
      return jsonResponse({ error: "could not start checkout" }, 400);
    }
    if (!home) {
      return jsonResponse({ error: "home not found" }, 404);
    }

    const nightMs = Date.parse(checkOut) - Date.parse(checkIn);
    const nights = Math.round(nightMs / 86_400_000);
    if (!Number.isFinite(nights) || nights <= 0) {
      return jsonResponse({ error: "check-out must be after check-in" }, 400);
    }

    const { data: quoteRows, error: quoteError } = await supabase.rpc("quote_stay", {
      nightly_paise: home.nightly_rate_paise,
      p_nights: nights,
    });
    if (quoteError) {
      console.error("checkout quote", quoteError.message);
      return jsonResponse({ error: "could not start checkout" }, 400);
    }
    const quote = Array.isArray(quoteRows) ? quoteRows[0] : quoteRows;
    if (!quote || typeof quote.total_paise !== "number") {
      return jsonResponse({ error: "could not quote stay" }, 400);
    }

    const orderResponse = await fetch("https://api.razorpay.com/v1/orders", {
      method: "POST",
      headers: {
        Authorization: `Basic ${btoa(`${razorpayKeyId}:${razorpayKeySecret}`)}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        amount: quote.total_paise,
        currency: "INR",
        payment_capture: true,
        receipt: `stay_${crypto.randomUUID().replaceAll("-", "").slice(0, 20)}`,
        notes: { home_id: homeId, check_in: checkIn, check_out: checkOut },
      }),
    });
    const orderJson = (await orderResponse.json()) as {
      id?: string;
      amount?: number;
      currency?: string;
      error?: { description?: string };
    };
    if (!orderResponse.ok || !orderJson.id || orderJson.amount !== quote.total_paise || orderJson.currency !== "INR") {
      console.error("checkout razorpay", orderResponse.status, orderJson.error?.description ?? "order mismatch");
      return jsonResponse({ error: "could not create razorpay order" }, 502);
    }

    const { data: booking, error: bookingError } = await supabase.rpc("create_pending_booking", {
      p_home_id: homeId,
      p_check_in: checkIn,
      p_check_out: checkOut,
      p_guests: guests,
      p_razorpay_order_id: orderJson.id,
    });
    if (bookingError) {
      console.error("checkout booking", bookingError.message);
      const overlap = bookingError.message.toLowerCase().includes("exclusion") || bookingError.code === "23P01";
      return jsonResponse(
        { error: overlap ? "Those dates are already reserved." : "could not start checkout" },
        overlap ? 409 : 400,
      );
    }
    const bookingRow = Array.isArray(booking) ? booking[0] : booking;
    const bookingTotal =
      typeof bookingRow?.total_paise === "number" ? bookingRow.total_paise : Number(bookingRow?.total_paise);
    if (!bookingRow?.id || bookingTotal !== quote.total_paise) {
      console.error("checkout booking total", bookingRow?.total_paise, quote.total_paise);
      return jsonResponse({ error: "could not start checkout" }, 409);
    }

    return jsonResponse({
      bookingId: bookingRow.id,
      razorpayOrderId: orderJson.id,
      amountPaise: quote.total_paise,
      currency: "INR",
      keyId: razorpayKeyId,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "checkout failed";
    console.error("checkout failed", message);
    if (message.includes("signed in")) {
      return jsonResponse({ error: "Sign in to reserve." }, 401);
    }
    return jsonResponse({ error: "could not start checkout" }, 400);
  }
});
