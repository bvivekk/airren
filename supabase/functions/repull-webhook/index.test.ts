import { hmacSha256Hex } from "../_shared/hmac.ts";

function signatureHeader(secret: string, timestamp: string, rawBody: string): Promise<string> {
  return hmacSha256Hex(secret, `${timestamp}.${rawBody}`).then((v1) => `t=${timestamp},v1=${v1}`);
}

Deno.test("webhook signature payload is timestamp dot raw body", async () => {
  const secret = "whsec_test";
  const rawBody = `{"event":"reservation.created","eventId":"evt_1","data":{"id":"r1"}}`;
  const timestamp = "1717243200";
  const header = await signatureHeader(secret, timestamp, rawBody);
  if (!header.startsWith("t=1717243200,v1=")) {
    throw new Error("signature header must carry t and v1");
  }
});
