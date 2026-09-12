import { signaturesMatch } from "./hmac.ts";

export type PayoutDestination = {
  method: "bank_account" | "vpa";
  label: string;
  contactId: string;
  fundAccountId: string;
};

export type SavePayoutAccountRequest =
  | { method: "bank_account"; accountNumber: string; ifsc: string; accountHolderName: string }
  | { method: "vpa"; vpa: string };

export type PayoutInitiation = {
  razorpayxPayoutId: string;
  wireStatus: "queued" | "processing" | "processed";
};

type RazorpayCollection<T> = {
  items?: T[];
};

type RazorpayContact = {
  id?: string;
  name?: string;
};

type RazorpayFundAccount = {
  id?: string;
};

type RazorpayPayout = {
  id?: string;
  status?: string;
  error?: { description?: string };
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function requireEnv(name: string): string {
  const value = Deno.env.get(name) ?? "";
  if (!value) {
    throw new Error(`${name} is not configured`);
  }
  return value;
}

function authHeader(): string {
  return `Basic ${btoa(`${requireEnv("RAZORPAYX_KEY_ID")}:${requireEnv("RAZORPAYX_KEY_SECRET")}`)}`;
}

function asNonEmpty(value: unknown, field: string): string {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`${field} is required`);
  }
  return value.trim();
}

function parseMethod(value: unknown): SavePayoutAccountRequest["method"] {
  if (value === "bank_account" || value === "vpa") {
    return value;
  }
  throw new Error("method must be bank_account or vpa");
}

export function parseSavePayoutAccountRequest(body: unknown): SavePayoutAccountRequest {
  if (!isRecord(body)) {
    throw new Error("payout account is required");
  }
  const method = parseMethod(body.method);
  switch (method) {
    case "bank_account": {
      const accountNumber = asNonEmpty(body.accountNumber, "account number").replace(/\s+/g, "");
      const ifsc = asNonEmpty(body.ifsc, "IFSC").toUpperCase();
      const accountHolderName = asNonEmpty(body.accountHolderName, "account holder name");
      if (!/^[0-9]{9,18}$/.test(accountNumber)) {
        throw new Error("account number is invalid");
      }
      if (!/^[A-Z]{4}0[A-Z0-9]{6}$/.test(ifsc)) {
        throw new Error("IFSC is invalid");
      }
      return { method, accountNumber, ifsc, accountHolderName };
    }
    case "vpa": {
      const vpa = asNonEmpty(body.vpa, "UPI id").toLowerCase();
      if (!/^[a-z0-9._-]+@[a-z0-9.-]+$/.test(vpa)) {
        throw new Error("UPI id is invalid");
      }
      return { method, vpa };
    }
    default: {
      const _never: never = method;
      return _never;
    }
  }
}

export function maskPayoutLabel(req: SavePayoutAccountRequest): string {
  switch (req.method) {
    case "bank_account":
      return `${req.ifsc.slice(0, 4)} ····${req.accountNumber.slice(-4)}`;
    case "vpa": {
      const at = req.vpa.indexOf("@");
      if (at <= 0) {
        return "····";
      }
      return `${req.vpa.slice(0, at + 3)}···`;
    }
    default: {
      const _never: never = req;
      return _never;
    }
  }
}

function payoutMode(method: SavePayoutAccountRequest["method"]): "IMPS" | "UPI" {
  switch (method) {
    case "bank_account":
      return "IMPS";
    case "vpa":
      return "UPI";
    default: {
      const _never: never = method;
      return _never;
    }
  }
}

function parseWireStatus(value: unknown): PayoutInitiation["wireStatus"] {
  if (value === "queued" || value === "processing" || value === "processed") {
    return value;
  }
  return "queued";
}

async function razorpayxJson<T>(path: string, init: RequestInit): Promise<T> {
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
    throw new Error(json.error?.description ?? `razorpayx ${path} failed`);
  }
  return json;
}

async function findOrCreateContact(hostId: string, name: string): Promise<string> {
  const existing = await razorpayxJson<RazorpayCollection<RazorpayContact>>(
    `/contacts?reference_id=${encodeURIComponent(hostId)}&count=1`,
    { method: "GET" },
  );
  const found = existing.items?.find((item) => typeof item.id === "string" && item.id.length > 0);
  if (found?.id) {
    return found.id;
  }
  const created = await razorpayxJson<RazorpayContact>("/contacts", {
    method: "POST",
    body: JSON.stringify({
      name,
      type: "vendor",
      reference_id: hostId,
    }),
  });
  if (!created.id) {
    throw new Error("could not create razorpayx contact");
  }
  return created.id;
}

function fundAccountBody(contactId: string, req: SavePayoutAccountRequest): Record<string, unknown> {
  switch (req.method) {
    case "bank_account":
      return {
        contact_id: contactId,
        account_type: "bank_account",
        bank_account: {
          name: req.accountHolderName,
          ifsc: req.ifsc,
          account_number: req.accountNumber,
        },
      };
    case "vpa":
      return {
        contact_id: contactId,
        account_type: "vpa",
        vpa: { address: req.vpa },
      };
    default: {
      const _never: never = req;
      return _never;
    }
  }
}

function contactName(hostId: string, req: SavePayoutAccountRequest): string {
  switch (req.method) {
    case "bank_account":
      return req.accountHolderName;
    case "vpa":
      return hostId;
    default: {
      const _never: never = req;
      return _never;
    }
  }
}

export async function createDestination(hostId: string, req: SavePayoutAccountRequest): Promise<PayoutDestination> {
  const contactId = await findOrCreateContact(hostId, contactName(hostId, req));
  const fund = await razorpayxJson<RazorpayFundAccount>("/fund_accounts", {
    method: "POST",
    body: JSON.stringify(fundAccountBody(contactId, req)),
  });
  if (!fund.id) {
    throw new Error("could not create razorpayx fund account");
  }
  return {
    method: req.method,
    label: maskPayoutLabel(req),
    contactId,
    fundAccountId: fund.id,
  };
}

export async function createPayout(args: {
  idempotencyKey: string;
  fundAccountId: string;
  amountPaise: number;
  referenceId: string;
  method: SavePayoutAccountRequest["method"];
}): Promise<PayoutInitiation> {
  const payout = await razorpayxJson<RazorpayPayout>("/payouts", {
    method: "POST",
    headers: { "X-Payout-Idempotency": args.idempotencyKey },
    body: JSON.stringify({
      account_number: requireEnv("RAZORPAYX_ACCOUNT_NUMBER"),
      fund_account_id: args.fundAccountId,
      amount: args.amountPaise,
      currency: "INR",
      mode: payoutMode(args.method),
      purpose: "payout",
      queue_if_low_balance: true,
      reference_id: args.referenceId,
    }),
  });
  if (!payout.id) {
    throw new Error("could not create razorpayx payout");
  }
  return {
    razorpayxPayoutId: payout.id,
    wireStatus: parseWireStatus(payout.status),
  };
}

export async function verifyWebhookSignature(rawBody: string, signature: string): Promise<boolean> {
  const secret = Deno.env.get("RAZORPAYX_WEBHOOK_SECRET") ?? "";
  if (!secret || !signature) {
    return false;
  }
  return signaturesMatch(secret, rawBody, signature);
}
