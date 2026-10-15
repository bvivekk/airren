import type { StayCheckout } from "../razorpay-checkout.ts";

async function postJson<T>(path: string, body: unknown): Promise<T> {
  const response = await fetch(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const payload = (await response.json().catch(() => null)) as ({ error?: string } & T) | null;
  if (!response.ok) {
    const message = payload && typeof payload.error === "string" ? payload.error : "Could not reach payments.";
    throw new Error(message);
  }
  return payload as T;
}

export function requestStayCheckout(body: {
  homeId: string;
  checkIn: string;
  checkOut: string;
  guests: number;
}): Promise<StayCheckout> {
  return postJson<StayCheckout>("/api/payments/checkout", body);
}

export function resumeStayPayment(bookingId: string): Promise<StayCheckout> {
  return postJson<StayCheckout>("/api/payments/checkout", { bookingId });
}

export function verifyStayCheckout(body: {
  bookingId: string;
  razorpayOrderId: string;
  razorpayPaymentId: string;
  razorpaySignature: string;
}): Promise<{ ok: true }> {
  return postJson("/api/payments/verify", body);
}

export function requestStayRefund(bookingId: string): Promise<{ ok: true; submitted: boolean }> {
  return postJson("/api/payments/refund", { bookingId });
}
