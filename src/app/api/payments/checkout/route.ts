import { auth } from "@clerk/nextjs/server";
import { paymentGateway } from "@/lib/payments/razorpay-gateway";
import { paymentsConfigured } from "@/lib/payments/config";
import {
  PaymentFlowError,
  mapBookingWriteError,
  paymentFlowStatus,
  readCheckoutCommand,
  resumeStayCheckout,
  startStayCheckout,
} from "@/lib/payments/flow";
import { getBookingById } from "@/lib/bookings-repo";
import { createServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

function jsonError(error: string, status: number): Response {
  return Response.json({ error }, { status });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function integerPaise(value: unknown): number | null {
  if (typeof value === "number" && Number.isInteger(value)) {
    return value;
  }
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    if (Number.isInteger(parsed)) {
      return parsed;
    }
  }
  return null;
}

function readInsertedBooking(data: unknown): { id: string; totalPaise: number } | null {
  const row = Array.isArray(data) ? data[0] : data;
  if (!isRecord(row) || typeof row.id !== "string") {
    return null;
  }
  const totalPaise = integerPaise(row.total_paise);
  if (totalPaise === null) {
    return null;
  }
  return { id: row.id, totalPaise };
}

export async function POST(request: Request): Promise<Response> {
  if (!paymentsConfigured()) {
    return jsonError("Payments are not available right now.", 503);
  }
  const gateway = paymentGateway("razorpay");
  if (!gateway) {
    return jsonError("Payments are not available right now.", 503);
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError("Checkout request was not valid.", 400);
  }
  const command = readCheckoutCommand(body);
  if (!command) {
    return jsonError("Checkout request was not valid.", 400);
  }

  const session = await auth();
  if (!session.userId) {
    return jsonError("Sign in to reserve.", 401);
  }

  try {
    if (command.kind === "resume") {
      const booking = await getBookingById(createServerClient(), command.bookingId);
      if (!booking) {
        return jsonError("This stay could not be found.", 404);
      }
      const checkout = resumeStayCheckout({
        booking,
        userId: session.userId,
        keyId: gateway.checkoutKeyId,
      });
      return Response.json(checkout);
    }

    const supabase = createServerClient();
    const { data: home, error: homeError } = await supabase
      .from("homes")
      .select("id, nightly_rate_paise, guests")
      .eq("id", command.homeId)
      .eq("status", "published")
      .maybeSingle();
    if (homeError) {
      console.error("checkout home", homeError.message);
      return jsonError("Could not start checkout.", 400);
    }
    if (!home) {
      return jsonError("This home is not available.", 404);
    }
    const nightlyRatePaise = integerPaise(home.nightly_rate_paise);
    const maxGuests = integerPaise(home.guests);
    if (nightlyRatePaise === null || maxGuests === null) {
      return jsonError("Could not start checkout.", 400);
    }

    const checkout = await startStayCheckout({
      home: { id: command.homeId, nightlyRatePaise, maxGuests },
      checkIn: command.checkIn,
      checkOut: command.checkOut,
      guests: command.guests,
      gateway,
      createBooking: async (input) => {
        const { data, error } = await supabase.rpc("create_pending_booking", {
          p_home_id: input.homeId,
          p_check_in: input.checkIn,
          p_check_out: input.checkOut,
          p_guests: input.guests,
          p_razorpay_order_id: input.orderId,
        });
        if (error) {
          console.error("checkout booking", error.message);
          throw mapBookingWriteError(error);
        }
        const inserted = readInsertedBooking(data);
        if (!inserted) {
          throw new PaymentFlowError("conflict", "Could not start checkout.");
        }
        return inserted;
      },
    });
    return Response.json(checkout);
  } catch (error) {
    if (error instanceof PaymentFlowError) {
      return jsonError(error.message, paymentFlowStatus(error.code));
    }
    console.error("checkout", error instanceof Error ? error.message : error);
    return jsonError("Could not start checkout.", 502);
  }
}
