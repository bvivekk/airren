/** USD cents × 83, rounded to ₹100 (10_000 paise). */
export function usdCentsToInrPaise(usdCents: number): number {
  return Math.round((usdCents * 83) / 10_000) * 10_000;
}

export function formatInr(paise: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(paise / 100);
}

export function formatInrApprox(paise: number): string {
  return `~${formatInr(paise)}`;
}
