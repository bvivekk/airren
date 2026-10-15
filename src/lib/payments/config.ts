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

export function readRazorpayEnv(env: NodeJS.ProcessEnv = process.env): RazorpayEnv | null {
  const keyId = trimmed(env, "RAZORPAY_KEY_ID");
  const keySecret = trimmed(env, "RAZORPAY_KEY_SECRET");
  const webhookSecret = trimmed(env, "RAZORPAY_WEBHOOK_SECRET");
  const publicKeyId = trimmed(env, "NEXT_PUBLIC_RAZORPAY_KEY_ID");
  if (!keyId || !keySecret || !webhookSecret || !publicKeyId || keyId !== publicKeyId) {
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
