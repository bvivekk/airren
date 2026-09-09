export function getRazorpayEventId(headers: Headers): string {
  return headers.get("x-razorpay-event-id") ?? "";
}
