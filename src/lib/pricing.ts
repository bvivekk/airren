export const HOST_COMMISSION_BPS = 1_000;

export type StayQuote = {
  nights: number;
  subtotalPaise: number;
  totalPaise: number;
};

export type HostEarnings = {
  commissionPaise: number;
  hostNetPaise: number;
};

export function quoteStay(nightlyRatePaise: number, nights: number): StayQuote {
  if (nights <= 0) {
    return {
      nights: 0,
      subtotalPaise: 0,
      totalPaise: 0,
    };
  }
  const subtotalPaise = nightlyRatePaise * nights;
  return {
    nights,
    subtotalPaise,
    totalPaise: subtotalPaise,
  };
}

export function hostEarningsFor(subtotalPaise: number): HostEarnings {
  const commissionPaise = Math.round((subtotalPaise * HOST_COMMISSION_BPS) / 10_000);
  return {
    commissionPaise,
    hostNetPaise: subtotalPaise - commissionPaise,
  };
}

export function scaledSavingsPaise(savingsForThreeNights: number, nights: number): number {
  if (nights <= 0) {
    return 0;
  }
  return Math.round((savingsForThreeNights * nights) / 3);
}
