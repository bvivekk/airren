export const CLEANING_FEE_PAISE = 1_200_000;
export const SERVICE_FEE_BPS = 500;

export type StayQuote = {
  nights: number;
  subtotalPaise: number;
  serviceFeePaise: number;
  cleaningFeePaise: number;
  totalPaise: number;
};

export function quoteStay(nightlyRatePaise: number, nights: number): StayQuote {
  if (nights <= 0) {
    return {
      nights: 0,
      subtotalPaise: 0,
      serviceFeePaise: 0,
      cleaningFeePaise: 0,
      totalPaise: 0,
    };
  }
  const subtotalPaise = nightlyRatePaise * nights;
  const serviceFeePaise = Math.round((subtotalPaise * SERVICE_FEE_BPS) / 10_000);
  return {
    nights,
    subtotalPaise,
    serviceFeePaise,
    cleaningFeePaise: CLEANING_FEE_PAISE,
    totalPaise: subtotalPaise + serviceFeePaise + CLEANING_FEE_PAISE,
  };
}

export function scaledSavingsPaise(savingsForThreeNights: number, nights: number): number {
  if (nights <= 0) {
    return 0;
  }
  return Math.round((savingsForThreeNights * nights) / 3);
}
