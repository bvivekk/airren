import type { StayQuote } from "../pricing.ts";
import { quoteStay } from "../pricing.ts";
import { isIsoDate, nightsBetween } from "../dates.ts";

export function serverStayCharge(input: { nightlyRatePaise: number; checkIn: string; checkOut: string }): StayQuote | null {
  if (!Number.isInteger(input.nightlyRatePaise) || input.nightlyRatePaise <= 0) {
    return null;
  }
  if (!isIsoDate(input.checkIn) || !isIsoDate(input.checkOut)) {
    return null;
  }
  const quote = quoteStay(input.nightlyRatePaise, nightsBetween(input.checkIn, input.checkOut));
  if (quote.nights <= 0 || quote.totalPaise <= 0) {
    return null;
  }
  return quote;
}
