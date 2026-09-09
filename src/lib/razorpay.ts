import { createHmac, timingSafeEqual } from "node:crypto";

function matchHex(digest: string, signature: string): boolean {
  const expected = Buffer.from(digest, "utf8");
  const actual = Buffer.from(signature, "utf8");
  if (expected.length !== actual.length) {
    return false;
  }
  return timingSafeEqual(expected, actual);
}

export function verifyRazorpayWebhookSignature(rawBody: string, signature: string, secret: string): boolean {
  const digest = createHmac("sha256", secret).update(rawBody).digest("hex");
  return matchHex(digest, signature);
}

export function verifyRazorpayCheckoutSignature(
  orderId: string,
  paymentId: string,
  signature: string,
  secret: string,
): boolean {
  const digest = createHmac("sha256", secret).update(`${orderId}|${paymentId}`).digest("hex");
  return matchHex(digest, signature);
}
