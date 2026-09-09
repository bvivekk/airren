export const CLEANING_FEE_CENTS = 12_000;
export const SERVICE_FEE_BPS = 500;

export type StayQuote = {
  nights: number;
  subtotalCents: number;
  serviceFeeCents: number;
  cleaningFeeCents: number;
  totalCents: number;
};

export function quoteStay(nightlyRateCents: number, nights: number): StayQuote {
  if (nights <= 0) {
    return {
      nights: 0,
      subtotalCents: 0,
      serviceFeeCents: 0,
      cleaningFeeCents: 0,
      totalCents: 0,
    };
  }
  const subtotalCents = nightlyRateCents * nights;
  const serviceFeeCents = Math.round((subtotalCents * SERVICE_FEE_BPS) / 10_000);
  return {
    nights,
    subtotalCents,
    serviceFeeCents,
    cleaningFeeCents: CLEANING_FEE_CENTS,
    totalCents: subtotalCents + serviceFeeCents + CLEANING_FEE_CENTS,
  };
}

export function scaledSavingsCents(savingsForThreeNights: number, nights: number): number {
  if (nights <= 0) {
    return 0;
  }
  return Math.round((savingsForThreeNights * nights) / 3);
}
