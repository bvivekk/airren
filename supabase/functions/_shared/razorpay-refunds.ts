type RazorpayRefund = {
  id?: string;
  receipt?: string | null;
  amount?: number;
  error?: { description?: string };
};

type RazorpayCollection<T> = {
  items?: T[];
};

export type CreatedRefund = {
  razorpayRefundId: string;
};

function requireEnv(name: string): string {
  const value = Deno.env.get(name) ?? "";
  if (!value) {
    throw new Error(`${name} is not configured`);
  }
  return value;
}

function authHeader(): string {
  return `Basic ${btoa(`${requireEnv("RAZORPAY_KEY_ID")}:${requireEnv("RAZORPAY_KEY_SECRET")}`)}`;
}

async function razorpayJson<T>(path: string, init: RequestInit): Promise<T> {
  const response = await fetch(`https://api.razorpay.com/v1${path}`, {
    ...init,
    headers: {
      Authorization: authHeader(),
      "Content-Type": "application/json",
      ...(init.headers ?? {}),
    },
  });
  const json = (await response.json()) as T & { error?: { description?: string } };
  if (!response.ok) {
    throw new Error(json.error?.description ?? `razorpay ${path} failed`);
  }
  return json;
}

export async function listRefundsByReceipt(
  razorpayPaymentId: string,
  receipt: string,
): Promise<CreatedRefund | null> {
  const listed = await razorpayJson<RazorpayCollection<RazorpayRefund>>(
    `/payments/${encodeURIComponent(razorpayPaymentId)}/refunds?count=100`,
    { method: "GET" },
  );
  const found = listed.items?.find((item) => item.receipt === receipt && typeof item.id === "string");
  if (!found?.id) {
    return null;
  }
  return { razorpayRefundId: found.id };
}

export async function createRefund(args: {
  razorpayPaymentId: string;
  amountPaise: number;
  receipt: string;
  idempotencyKey: string;
}): Promise<CreatedRefund> {
  try {
    const created = await razorpayJson<RazorpayRefund>(
      `/payments/${encodeURIComponent(args.razorpayPaymentId)}/refund`,
      {
        method: "POST",
        headers: { "Idempotency-Key": args.idempotencyKey },
        body: JSON.stringify({
          amount: args.amountPaise,
          receipt: args.receipt,
        }),
      },
    );
    if (!created.id) {
      throw new Error("could not create razorpay refund");
    }
    return { razorpayRefundId: created.id };
  } catch (cause) {
    const existing = await listRefundsByReceipt(args.razorpayPaymentId, args.receipt);
    if (existing) {
      return existing;
    }
    throw cause;
  }
}
