import { authenticateRepullWebhook } from "./authenticate.ts";
import { fetchReservation, parseReservationSnapshot, type ReservationSnapshot } from "./api.ts";
import { RepullError } from "./errors.ts";
import { stay, type Stay } from "./occupancy-domain.ts";
import { isCancelledStatus, parseRepullEnvelope } from "./wire.ts";

export type RepullOccupancyCommand =
  | {
      readonly kind: "upsert";
      readonly eventId: string;
      readonly eventType: "reservation.created" | "reservation.updated" | "reconciliation";
      readonly platform: "airbnb";
      readonly listingId: string;
      readonly reservationId: string;
      readonly stay: Stay;
      readonly label: string;
      readonly observedAt: string;
      readonly payloadDigest: string;
    }
  | {
      readonly kind: "release";
      readonly eventId: string;
      readonly eventType:
        | "reservation.created"
        | "reservation.updated"
        | "reservation.cancelled"
        | "reconciliation";
      readonly platform: "airbnb";
      readonly listingId: string;
      readonly reservationId: string;
      readonly observedAt: string;
      readonly payloadDigest: string;
    };

async function sha256Hex(value: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

function labelFor(snapshot: ReservationSnapshot): string {
  return snapshot.confirmationCode ? `Airbnb · ${snapshot.confirmationCode}` : "Airbnb stay";
}

function upsertEventType(
  eventType: RepullOccupancyCommand["eventType"],
): "reservation.created" | "reservation.updated" | "reconciliation" {
  return eventType === "reservation.cancelled" ? "reservation.updated" : eventType;
}

function commandFromSnapshot(
  snapshot: ReservationSnapshot,
  eventId: string,
  eventType: RepullOccupancyCommand["eventType"],
  payloadDigest: string,
  observedAt: string,
): RepullOccupancyCommand {
  if (isCancelledStatus(snapshot.status)) {
    return {
      kind: "release",
      eventId,
      eventType,
      platform: "airbnb",
      listingId: snapshot.listingId,
      reservationId: snapshot.id,
      observedAt,
      payloadDigest,
    };
  }
  const nights = stay(snapshot.checkIn, snapshot.checkOut);
  if (!nights) {
    throw new RepullError("invalid", "invalid dates");
  }
  return {
    kind: "upsert",
    eventId,
    eventType: upsertEventType(eventType),
    platform: "airbnb",
    listingId: snapshot.listingId,
    reservationId: snapshot.id,
    stay: nights,
    label: labelFor(snapshot),
    observedAt,
    payloadDigest,
  };
}

export async function commandFromDelivery(rawBody: string, headers: Headers): Promise<RepullOccupancyCommand> {
  const secret = Deno.env.get("REPULL_WEBHOOK_SECRET");
  if (!secret) {
    throw new RepullError("retryable", "repull is not configured");
  }
  await authenticateRepullWebhook(rawBody, headers, secret);
  const envelope = parseRepullEnvelope(rawBody);
  const payloadDigest = await sha256Hex(rawBody);
  const snapshot = await fetchReservation(envelope.reservationId);
  if (snapshot === "missing") {
    if (envelope.eventType === "reservation.cancelled" || isCancelledStatus(envelope.status)) {
      return {
        kind: "release",
        eventId: envelope.eventId,
        eventType: envelope.eventType,
        platform: envelope.platform,
        listingId: envelope.listingId,
        reservationId: envelope.reservationId,
        observedAt: envelope.observedAt,
        payloadDigest,
      };
    }
    throw new RepullError("retryable", "repull reservation fetch failed");
  }
  return commandFromSnapshot(snapshot, envelope.eventId, envelope.eventType, payloadDigest, envelope.observedAt);
}

export async function commandFromReconciliation(snapshot: unknown): Promise<RepullOccupancyCommand> {
  const parsed = parseReservationSnapshot(snapshot);
  if (!parsed) {
    throw new RepullError("invalid", "invalid payload");
  }
  const payloadDigest = await sha256Hex(
    JSON.stringify({
      id: parsed.id,
      listingId: parsed.listingId,
      status: parsed.status,
      checkIn: parsed.checkIn,
      checkOut: parsed.checkOut,
    }),
  );
  return commandFromSnapshot(
    parsed,
    `reconcile:${parsed.id}:${payloadDigest}`,
    "reconciliation",
    payloadDigest,
    new Date().toISOString(),
  );
}
