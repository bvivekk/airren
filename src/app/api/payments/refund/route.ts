import { auth } from "@clerk/nextjs/server";
import { getBookingById } from "@/lib/bookings-repo";
import { paymentsConfigured } from "@/lib/payments/config";
import { PaymentFlowError, paymentFlowStatus, submitClaimedRefund, type ClaimedRefund } from "@/lib/payments/flow";
import { paymentGateway } from "@/lib/payments/razorpay-gateway";
import { createServerClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";

export const runtime = "nodejs";

function jsonError(error: string, status: number): Response {
  return Response.json({ error }, { status });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function readClaim(data: unknown): ClaimedRefund | null {
  if (!isRecord(data)) {
    return null;
  }
  const amount = data.amount_paise;
  const amountPaise = typeof amount === "number" ? amount : Number(amount);
  if (typeof data.id !== "string" || typeof data.razorpay_payment_id !== "string" || typeof data.receipt !== "string") {
    return null;
  }
  if (!Number.isInteger(amountPaise) || amountPaise <= 0) {
    return null;
  }
  return {
    id: data.id,
    paymentId: data.razorpay_payment_id,
    amountPaise,
    receipt: data.receipt,
  };
}

export async function POST(request: Request): Promise<Response> {
  if (!paymentsConfigured()) {
    return jsonError("Payments are not available right now.", 503);
  }
  const gateway = paymentGateway("razorpay");
  const admin = createServiceClient();
  if (!gateway || !admin) {
    return jsonError("Payments are not available right now.", 503);
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError("Refund request was not valid.", 400);
  }
  const bookingId = isRecord(body) && typeof body.bookingId === "string" ? body.bookingId : "";
  if (!bookingId) {
    return jsonError("Refund request was not valid.", 400);
  }

  const session = await auth();
  if (!session.userId) {
    return jsonError("Sign in to cancel a stay.", 401);
  }

  try {
    const booking = await getBookingById(createServerClient(), bookingId);
    if (!booking || booking.guestId !== session.userId) {
      return jsonError("This stay could not be found.", 404);
    }
    if (booking.status !== "canceled") {
      return jsonError("Only a canceled stay can be refunded.", 409);
    }
    const { data, error } = await admin.rpc("claim_guest_refund", { p_booking_id: bookingId });
    if (error) {
      console.error("claim refund", error.message);
      return jsonError("Refund could not be started.", 502);
    }
    const submitted = await submitClaimedRefund({
      claimed: readClaim(data),
      gateway,
      recordSubmitted: async (refundId, providerRefundId) => {
        const { error: recordError } = await admin.rpc("record_refund_submitted", {
          p_refund_id: refundId,
          p_razorpay_refund_id: providerRefundId,
        });
        if (recordError) {
          throw new Error(recordError.message);
        }
      },
    });
    return Response.json({ ok: true, submitted });
  } catch (error) {
    if (error instanceof PaymentFlowError) {
      return jsonError(error.message, paymentFlowStatus(error.code));
    }
    console.error("refund", error instanceof Error ? error.message : error);
    return jsonError("Refund could not be started.", 502);
  }
}
