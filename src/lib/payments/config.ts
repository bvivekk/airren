export type RazorpayEnv = {
  keyId: string;
  keySecret: string;
  webhookSecret: string;
  publicKeyId: string;
};

function trimmed(env: NodeJS.ProcessEnv, name: string): string {
  const value = env[name];
  return typeof value === "string" ? value.trim() : "";
}

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

export function readRazorpayEnv(env: NodeJS.ProcessEnv = process.env): RazorpayEnv | null {
  const keyId = trimmed(env, "RAZORPAY_KEY_ID");
  const keySecret = trimmed(env, "RAZORPAY_KEY_SECRET");
  const webhookSecret = trimmed(env, "RAZORPAY_WEBHOOK_SECRET");
  const publicKeyId = trimmed(env, "NEXT_PUBLIC_RAZORPAY_KEY_ID");
  const mode = trimmed(env, "RAZORPAY_MODE");
  if (!keyId || !keySecret || !webhookSecret || !publicKeyId || keyId !== publicKeyId) {
    return null;
  }
  if (!razorpayKeyAllowed(keyId, mode)) {
    return null;
  }
  return { keyId, keySecret, webhookSecret, publicKeyId };
}

export function paymentsConfigured(env: NodeJS.ProcessEnv = process.env): boolean {
  return (
    readRazorpayEnv(env) !== null &&
    trimmed(env, "SUPABASE_SERVICE_ROLE_KEY").length > 0 &&
    trimmed(env, "NEXT_PUBLIC_SUPABASE_URL").length > 0
  );
}
