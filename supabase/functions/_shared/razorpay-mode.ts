// Keep in sync with razorpayKeyAllowed in src/lib/payments/config.ts.
export function razorpayKeyAllowed(keyId: string, mode: string): boolean {
  const trimmedKey = keyId.trim();
  const trimmedMode = mode.trim();
  const live = trimmedKey.startsWith("rzp_live_");
  const test = trimmedKey.startsWith("rzp_test_");
  if (live === test) {
    return false;
  }
  if (trimmedMode !== "" && trimmedMode !== "test" && trimmedMode !== "live") {
    return false;
  }
  if (live) {
    return trimmedMode === "live";
  }
  return trimmedMode !== "live";
}
