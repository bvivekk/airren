import { auth } from "@clerk/nextjs/server";
import { getBookingById } from "@/lib/bookings-repo";
import { paymentsConfigured } from "@/lib/payments/config";
import { PaymentFlowError, paymentFlowStatus, readVerifyCommand, verifyStayPayment } from "@/lib/payments/flow";
import { paymentGateway } from "@/lib/payments/razorpay-gateway";
import { createServerClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";

export const runtime = "nodejs";

function jsonError(error: string, status: number): Response {
  return Response.json({ error }, { status });
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
    return jsonError("Payment could not be verified.", 400);
  }
  const command = readVerifyCommand(body);
  if (!command) {
    return jsonError("Payment could not be verified.", 400);
  }

  const session = await auth();
  if (!session.userId) {
    return jsonError("Sign in to reserve.", 401);
  }

  try {
    const booking = await getBookingById(createServerClient(), command.bookingId);
    if (!booking) {
      return jsonError("This stay could not be found.", 404);
    }
    await verifyStayPayment({
      booking,
      userId: session.userId,
      orderId: command.orderId,
      paymentId: command.paymentId,
      signature: command.signature,
      gateway,
      confirm: async (amountPaise) => {
        const { error } = await admin.rpc("confirm_booking", {
          p_order_id: command.orderId,
          p_payment_id: command.paymentId,
          p_amount_paise: amountPaise,
        });
        if (error) {
          console.error("confirm booking", error.message);
          throw new PaymentFlowError("conflict", "Payment could not be confirmed.");
        }
      },
    });
    return Response.json({ ok: true });
  } catch (error) {
    if (error instanceof PaymentFlowError) {
      return jsonError(error.message, paymentFlowStatus(error.code));
    }
    console.error("verify payment", error instanceof Error ? error.message : error);
    return jsonError("Payment could not be verified.", 502);
  }
}
