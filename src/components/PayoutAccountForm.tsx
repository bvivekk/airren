"use client";

import { useSession } from "@clerk/nextjs";
import { useState } from "react";
import type { HostPayoutAccount, PayoutMethod, SavePayoutAccountRequest } from "@/domain/payout";
import { clerkSupabaseJwtTemplate } from "@/lib/clerk-supabase";
import { useSupabaseClient } from "@/lib/supabase/browser";

const PAYOUT_METHOD_OPTIONS: PayoutMethod[] = ["vpa", "bank_account"];

function fieldClassName() {
  return "mt-2 w-full rounded-full border border-line bg-white px-4 py-2.5 text-sm outline-none";
}

function methodLabel(method: PayoutMethod): string {
  switch (method) {
    case "bank_account":
      return "Bank account";
    case "vpa":
      return "UPI";
    default: {
      const _never: never = method;
      return _never;
    }
  }
}

function accountRequest(
  method: PayoutMethod,
  fields: { vpa: string; accountNumber: string; ifsc: string; accountHolderName: string },
): SavePayoutAccountRequest {
  switch (method) {
    case "vpa":
      return { method, vpa: fields.vpa };
    case "bank_account":
      return {
        method,
        accountNumber: fields.accountNumber,
        ifsc: fields.ifsc,
        accountHolderName: fields.accountHolderName,
      };
    default: {
      const _never: never = method;
      return _never;
    }
  }
}

export function PayoutAccountForm({ initial }: { initial: HostPayoutAccount | null }) {
  const supabase = useSupabaseClient();
  const { session } = useSession();
  const [method, setMethod] = useState<PayoutMethod>(initial?.method ?? "vpa");
  const [vpa, setVpa] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [ifsc, setIfsc] = useState("");
  const [accountHolderName, setAccountHolderName] = useState("");
  const [account, setAccount] = useState(initial);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  function methodFields() {
    switch (method) {
      case "vpa":
        return (
          <label className="mt-4 block text-xs font-semibold tracking-wide">
            UPI ID
            <input
              className={fieldClassName()}
              value={vpa}
              onChange={(event) => setVpa(event.target.value)}
              placeholder="name@okhdfcbank"
              autoComplete="off"
              required
            />
          </label>
        );
      case "bank_account":
        return (
          <div className="mt-4 space-y-4">
            <label className="block text-xs font-semibold tracking-wide">
              ACCOUNT HOLDER
              <input
                className={fieldClassName()}
                value={accountHolderName}
                onChange={(event) => setAccountHolderName(event.target.value)}
                required
              />
            </label>
            <label className="block text-xs font-semibold tracking-wide">
              ACCOUNT NUMBER
              <input
                className={fieldClassName()}
                value={accountNumber}
                onChange={(event) => setAccountNumber(event.target.value)}
                inputMode="numeric"
                autoComplete="off"
                required
              />
            </label>
            <label className="block text-xs font-semibold tracking-wide">
              IFSC
              <input
                className={fieldClassName()}
                value={ifsc}
                onChange={(event) => setIfsc(event.target.value.toUpperCase())}
                autoComplete="off"
                required
              />
            </label>
          </div>
        );
      default: {
        const _never: never = method;
        return _never;
      }
    }
  }

  const save = async () => {
    setPending(true);
    setError("");
    const body = accountRequest(method, { vpa, accountNumber, ifsc, accountHolderName });
    const token = (await session?.getToken({ template: clerkSupabaseJwtTemplate })) ?? null;
    const { data, error: invokeError } = await supabase.functions.invoke("save-payout-account", {
      body,
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    setPending(false);
    if (invokeError) {
      setError(invokeError.message || "Could not save payout account.");
      return;
    }
    const saved = data as HostPayoutAccount | { error?: string } | null;
    if (!saved || ("error" in saved && saved.error)) {
      setError((saved && "error" in saved && saved.error) || "Could not save payout account.");
      return;
    }
    setAccount(saved as HostPayoutAccount);
    setVpa("");
    setAccountNumber("");
    setIfsc("");
    setAccountHolderName("");
  };

  return (
    <form
      className="rounded-3xl border border-line bg-white px-5 py-5"
      onSubmit={(event) => {
        event.preventDefault();
        void save();
      }}
    >
      <h2 className="text-lg font-semibold">Payout account</h2>
      {account ? (
        <p className="mt-2 text-sm text-muted">
          Paying to {account.label} ({methodLabel(account.method)}).
        </p>
      ) : (
        <p className="mt-2 text-sm text-muted">Add a bank account or UPI id so we can send your 90% after check-in.</p>
      )}
      <div className="mt-4 flex gap-2">
        {PAYOUT_METHOD_OPTIONS.map((option) => (
          <button
            key={option}
            type="button"
            className={`rounded-full px-4 py-2 text-sm ${
              method === option ? "bg-foreground text-white" : "border border-line text-foreground"
            }`}
            onClick={() => setMethod(option)}
          >
            {methodLabel(option)}
          </button>
        ))}
      </div>
      {methodFields()}
      {error ? <p className="mt-3 text-sm text-muted">{error}</p> : null}
      <button
        type="submit"
        className="mt-5 rounded-full bg-foreground px-5 py-2.5 text-sm font-medium text-white disabled:opacity-40"
        disabled={pending}
      >
        {account ? "Update payout account" : "Save payout account"}
      </button>
    </form>
  );
}
