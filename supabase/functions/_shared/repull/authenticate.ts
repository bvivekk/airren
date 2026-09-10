import { signaturesMatch } from "../hmac.ts";
import { RepullError } from "./errors.ts";

const TOLERANCE_SECONDS = 5 * 60;

function signatureParts(header: string): { t: string; v1: string } {
  const parts: Record<string, string> = {};
  for (const piece of header.split(",")) {
    const idx = piece.indexOf("=");
    if (idx <= 0) {
      continue;
    }
    parts[piece.slice(0, idx).trim()] = piece.slice(idx + 1).trim();
  }
  return { t: parts.t ?? "", v1: parts.v1 ?? "" };
}

export async function authenticateRepullWebhook(
  rawBody: string,
  headers: Headers,
  secret: string,
): Promise<void> {
  const header = headers.get("x-repull-signature") ?? headers.get("repull-signature") ?? "";
  const { t, v1 } = signatureParts(header);
  if (!t || !v1) {
    throw new RepullError("untrusted", "invalid signature");
  }
  const age = Math.floor(Date.now() / 1000) - Number(t);
  if (!Number.isFinite(age) || Math.abs(age) > TOLERANCE_SECONDS) {
    throw new RepullError("untrusted", "stale timestamp");
  }
  if (!(await signaturesMatch(secret, `${t}.${rawBody}`, v1))) {
    throw new RepullError("untrusted", "invalid signature");
  }
}
