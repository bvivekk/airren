import { stay, type Stay } from "./occupancy-domain.ts";
import { RepullError } from "./errors.ts";

export type RepullEventType =
  | "reservation.created"
  | "reservation.updated"
  | "reservation.cancelled";

export type RepullEnvelope = {
  readonly eventType: RepullEventType;
  readonly eventId: string;
  readonly reservationId: string;
  readonly listingId: string;
  readonly platform: "airbnb";
  readonly status: string;
  readonly stay: Stay | null;
  readonly label: string;
  readonly observedAt: string;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function asText(value: unknown): string {
  if (typeof value === "string" && value.length > 0) {
    return value;
  }
  if (typeof value === "number" && Number.isFinite(value)) {
    return String(value);
  }
  return "";
}

function eventTypeOf(value: string): RepullEventType | null {
  switch (value) {
    case "reservation.created":
    case "reservation.updated":
    case "reservation.cancelled":
      return value;
    default:
      return null;
  }
}

function platformOf(value: string): "airbnb" | null {
  return value.toLowerCase() === "airbnb" ? "airbnb" : null;
}

export function parseRepullEnvelope(rawBody: string): RepullEnvelope {
  let parsed: unknown;
  try {
    parsed = JSON.parse(rawBody);
  } catch {
    throw new RepullError("invalid", "invalid json");
  }
  if (!isRecord(parsed)) {
    throw new RepullError("invalid", "invalid payload");
  }
  const eventType = eventTypeOf(asText(parsed.event) || asText(parsed.type));
  const eventId = asText(parsed.eventId) || asText(parsed.deliveryId);
  const data = isRecord(parsed.data) ? parsed.data : parsed;
  const reservationId = asText(data.id);
  const listingId = asText(data.listingId) || asText(data.propertyId);
  const platform = platformOf(asText(data.platform) || asText(data.source));
  const status = asText(data.status).toLowerCase();
  const checkIn = asText(data.checkIn);
  const checkOut = asText(data.checkOut);
  const confirmation = asText(data.confirmationCode);
  if (!eventType || !eventId || !reservationId || !listingId || !platform) {
    throw new RepullError("invalid", "invalid payload");
  }
  const nights = checkIn && checkOut ? stay(checkIn, checkOut) : null;
  if (eventType !== "reservation.cancelled" && nights === null) {
    throw new RepullError("invalid", "invalid dates");
  }
  const timestamp = asText(parsed.timestamp) || asText(parsed.createdAt) || new Date().toISOString();
  return {
    eventType,
    eventId,
    reservationId,
    listingId,
    platform,
    status,
    stay: nights,
    label: confirmation ? `Airbnb · ${confirmation}` : "Airbnb stay",
    observedAt: timestamp,
  };
}

export function isCancelledStatus(status: string): boolean {
  const normalized = status.toLowerCase();
  return normalized === "cancelled" || normalized === "canceled";
}
