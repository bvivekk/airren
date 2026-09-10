import { jsonResponse } from "../http.ts";
import type { ProjectionOutcome, TerminalProjectionOutcome } from "./projector.ts";
import { isRepullError } from "./errors.ts";

function statusFor(kind: TerminalProjectionOutcome["kind"]): number {
  switch (kind) {
    case "applied":
    case "cancelled":
      return 200;
    case "needs_mapping":
    case "conflict":
      return 202;
    default: {
      const _never: never = kind;
      return _never;
    }
  }
}

export function webhookResponse(outcome: ProjectionOutcome): Response {
  const terminal = outcome.kind === "duplicate" ? outcome.original : outcome;
  return jsonResponse(outcome, statusFor(terminal.kind));
}

export function failureResponse(error: unknown): Response {
  if (isRepullError(error)) {
    switch (error.kind) {
      case "untrusted":
        return jsonResponse({ error: error.message }, 401);
      case "invalid":
        return jsonResponse({ error: error.message }, 400);
      case "retryable":
        return jsonResponse({ error: error.message }, 503);
      default: {
        const _never: never = error.kind;
        return _never;
      }
    }
  }
  const message = error instanceof Error ? error.message : "repull webhook failed";
  return jsonResponse({ error: message }, 503);
}
