"use client";

import { useSignIn, useSignUp, useUser } from "@clerk/nextjs";
import { useState } from "react";
import { useChrome } from "@/components/ChromeProvider";
import { toE164 } from "@/lib/phone";

type Channel = "phone" | "email";
type Step = "identifier" | "code";
type AuthFlow = "signin" | "signup";

function firstMessage(...messages: Array<string | undefined | null>): string | null {
  for (const message of messages) {
    if (message) {
      return message;
    }
  }
  return null;
}

export function SignInModal() {
  const { signInOpen, setSignInOpen } = useChrome();
  const { signIn, errors: signInErrors, fetchStatus: signInStatus } = useSignIn();
  const { signUp, errors: signUpErrors, fetchStatus: signUpStatus } = useSignUp();
  const { isSignedIn } = useUser();
  const [channel, setChannel] = useState<Channel>("phone");
  const [step, setStep] = useState<Step>("identifier");
  const [flow, setFlow] = useState<AuthFlow>("signin");
  const [identifier, setIdentifier] = useState("");
  const [code, setCode] = useState("");
  const [localError, setLocalError] = useState<string | null>(null);
  const busy = signInStatus === "fetching" || signUpStatus === "fetching";

  if (!signInOpen || isSignedIn) {
    return null;
  }

  function close() {
    setSignInOpen(false);
    setStep("identifier");
    setCode("");
    setLocalError(null);
    signIn.reset();
    signUp.reset();
  }

  async function finish(kind: AuthFlow) {
    switch (kind) {
      case "signin":
        if (signIn.status === "complete") {
          await signIn.finalize({ navigate: async () => close() });
        }
        return;
      case "signup":
        if (signUp.status === "complete") {
          await signUp.finalize({ navigate: async () => close() });
        }
        return;
      default: {
        const _never: never = kind;
        return _never;
      }
    }
  }

  async function sendPhoneCode() {
    const phoneNumber = toE164(identifier);
    if (phoneNumber.length < 8) {
      setLocalError("Enter a valid phone number.");
      return;
    }
    const { error } = await signIn.phoneCode.sendCode({ phoneNumber });
    if (!error) {
      setFlow("signin");
      setStep("code");
      return;
    }
    const created = await signUp.create({ phoneNumber });
    if (created.error) {
      setLocalError(created.error.message || error.message);
      return;
    }
    const sent = await signUp.verifications.sendPhoneCode();
    if (sent.error) {
      setLocalError(sent.error.message);
      return;
    }
    setFlow("signup");
    setStep("code");
  }

  async function sendEmailCode() {
    const emailAddress = identifier.trim();
    if (!emailAddress.includes("@")) {
      setLocalError("Enter a valid email.");
      return;
    }
    const { error } = await signIn.emailCode.sendCode({ emailAddress });
    if (!error) {
      setFlow("signin");
      setStep("code");
      return;
    }
    const created = await signUp.create({ emailAddress });
    if (created.error) {
      setLocalError(created.error.message || error.message);
      return;
    }
    const sent = await signUp.verifications.sendEmailCode();
    if (sent.error) {
      setLocalError(sent.error.message);
      return;
    }
    setFlow("signup");
    setStep("code");
  }

  async function sendCode() {
    setLocalError(null);
    switch (channel) {
      case "phone":
        await sendPhoneCode();
        return;
      case "email":
        await sendEmailCode();
        return;
      default: {
        const _never: never = channel;
        return _never;
      }
    }
  }

  async function verifyCode() {
    setLocalError(null);
    if (flow === "signin") {
      const result =
        channel === "phone"
          ? await signIn.phoneCode.verifyCode({ code })
          : await signIn.emailCode.verifyCode({ code });
      if (result.error) {
        setLocalError(result.error.message);
        return;
      }
      await finish("signin");
      return;
    }
    const result =
      channel === "phone"
        ? await signUp.verifications.verifyPhoneCode({ code })
        : await signUp.verifications.verifyEmailCode({ code });
    if (result.error) {
      setLocalError(result.error.message);
      return;
    }
    await finish("signup");
  }

  const clerkError =
    flow === "signin"
      ? firstMessage(
          step === "code" ? signInErrors.fields.code?.message : undefined,
          signInErrors.fields.identifier?.message,
          signInErrors.global?.[0]?.message,
        )
      : firstMessage(
          step === "code" ? signUpErrors.fields.code?.message : undefined,
          channel === "phone" ? signUpErrors.fields.phoneNumber?.message : signUpErrors.fields.emailAddress?.message,
          signUpErrors.global?.[0]?.message,
        );
  const message = localError ?? clerkError;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <button type="button" className="absolute inset-0 bg-black/30" aria-label="Close sign in" onClick={close} />
      <form
        className="relative w-full max-w-sm rounded-3xl bg-white p-6 shadow-xl"
        onSubmit={(event) => {
          event.preventDefault();
          if (step === "identifier") {
            void sendCode();
            return;
          }
          void verifyCode();
        }}
      >
        <h2 className="text-xl font-semibold">Sign in or sign up</h2>
        <p className="mt-2 text-sm text-muted">Phone OTP by default. Email if you prefer.</p>
        <div className="mt-4 grid grid-cols-2 rounded-full bg-pill p-1 text-sm">
          <button
            type="button"
            className={`rounded-full py-2 ${channel === "phone" ? "bg-white font-medium shadow-sm" : "text-muted"}`}
            onClick={() => {
              setChannel("phone");
              setStep("identifier");
              setCode("");
              setLocalError(null);
            }}
          >
            Phone
          </button>
          <button
            type="button"
            className={`rounded-full py-2 ${channel === "email" ? "bg-white font-medium shadow-sm" : "text-muted"}`}
            onClick={() => {
              setChannel("email");
              setStep("identifier");
              setCode("");
              setLocalError(null);
            }}
          >
            Email
          </button>
        </div>
        {step === "identifier" ? (
          <label className="mt-5 block text-sm font-medium">
            {channel === "phone" ? "Phone" : "Email"}
            <input
              value={identifier}
              onChange={(event) => setIdentifier(event.target.value)}
              className="mt-2 w-full rounded-full border border-line px-4 py-2.5 text-sm outline-none"
              placeholder={channel === "phone" ? "+91 98765 43210" : "you@example.com"}
              type={channel === "phone" ? "tel" : "email"}
              autoComplete={channel === "phone" ? "tel" : "email"}
              autoFocus
            />
          </label>
        ) : (
          <label className="mt-5 block text-sm font-medium">
            Code
            <input
              value={code}
              onChange={(event) => setCode(event.target.value)}
              className="mt-2 w-full rounded-full border border-line px-4 py-2.5 text-sm outline-none"
              placeholder="6-digit code"
              inputMode="numeric"
              autoComplete="one-time-code"
              autoFocus
            />
          </label>
        )}
        {message ? <p className="mt-3 text-sm text-red-600">{message}</p> : null}
        <button
          type="submit"
          className="mt-5 w-full rounded-full bg-foreground py-3 text-sm font-medium text-white disabled:opacity-40"
          disabled={busy}
        >
          {step === "identifier" ? "Send code" : "Verify"}
        </button>
        {step === "code" ? (
          <button
            type="button"
            className="mt-3 w-full text-sm text-muted"
            onClick={() => {
              setStep("identifier");
              setCode("");
              setLocalError(null);
            }}
          >
            Use a different {channel === "phone" ? "number" : "email"}
          </button>
        ) : null}
        <div id="clerk-captcha" className="mt-4" />
      </form>
    </div>
  );
}
