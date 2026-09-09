"use client";

import { useSignIn, useSignUp, useUser } from "@clerk/nextjs";
import type { OAuthStrategy } from "@clerk/nextjs/types";
import { useEffect, useState } from "react";
import { useChrome } from "@/components/ChromeProvider";
import { LogoMark } from "@/components/Logo";
import { safeAppPath } from "@/lib/auth-redirect";
import { toE164 } from "@/lib/phone";

type Channel = "phone" | "email";
type Step = "identifier" | "code";
type AuthFlow = "signin" | "signup";
type SocialStrategy = Extract<OAuthStrategy, "oauth_google" | "oauth_apple">;

function firstMessage(...messages: Array<string | undefined | null>): string | null {
  for (const message of messages) {
    if (message) {
      return message;
    }
  }
  return null;
}

function GoogleMark() {
  return (
    <svg viewBox="0 0 24 24" className="h-6 w-6" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.51H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.58 3.3-4.53 6.16-4.53z"
      />
    </svg>
  );
}

function AppleMark() {
  return (
    <svg viewBox="0 0 24 24" className="h-6 w-6" aria-hidden="true">
      <path
        fill="currentColor"
        d="M16.365 1.43c0 1.14-.415 2.2-1.164 3.01-.768.83-2.035 1.47-3.27 1.38-.146-1.09.42-2.24 1.16-3.02.77-.81 2.11-1.4 3.274-1.37zM20.75 17.21c-.55 1.27-.81 1.84-1.52 2.96-1 1.56-2.4 3.5-4.14 3.51-1.54.02-1.94-1.01-4.04-1-2.1.01-2.54 1.02-4.08 1-1.75-.02-3.09-1.77-4.09-3.33-2.79-4.36-3.08-9.48-1.36-12.2 1.22-1.93 3.15-3.06 4.97-3.06 1.85 0 3.02 1.02 4.55 1.02 1.5 0 2.41-1.03 4.57-1.03 1.63 0 3.36.89 4.58 2.43-4.02 2.2-3.37 7.93.56 9.7z"
      />
    </svg>
  );
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

  useEffect(() => {
    if (!signInOpen || isSignedIn) {
      return;
    }
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    function onKeyDown(event: KeyboardEvent) {
      if (event.key !== "Escape") {
        return;
      }
      setSignInOpen(false);
      setStep("identifier");
      setCode("");
      setLocalError(null);
      signIn.reset();
      signUp.reset();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [isSignedIn, setSignInOpen, signIn, signInOpen, signUp]);

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
      setLocalError("Enter a valid phone number or email.");
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
      setLocalError("Enter a valid phone number or email.");
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
    const trimmed = identifier.trim();
    const nextChannel: Channel = trimmed.includes("@") ? "email" : "phone";
    setChannel(nextChannel);
    switch (nextChannel) {
      case "phone":
        await sendPhoneCode();
        return;
      case "email":
        await sendEmailCode();
        return;
      default: {
        const _never: never = nextChannel;
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

  async function signInWith(strategy: SocialStrategy) {
    setLocalError(null);
    const returnPath = safeAppPath(`${window.location.pathname}${window.location.search}`);
    const { error } = await signIn.sso({
      strategy,
      redirectUrl: returnPath,
      redirectCallbackUrl: `/sso-callback?redirect_url=${encodeURIComponent(returnPath)}`,
    });
    if (error) {
      setLocalError(error.message);
    }
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
  const heading = step === "identifier" ? "Log in or sign up" : "Enter your code";

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
      <button
        type="button"
        className="absolute inset-0 bg-black/40 backdrop-blur-md"
        aria-label="Close sign in"
        onClick={close}
      />
      <form
        role="dialog"
        aria-modal="true"
        aria-labelledby="sign-in-heading"
        className="relative w-full max-w-[400px] rounded-[36px] bg-white px-8 pb-8 pt-6 shadow-[0_16px_70px_rgba(0,0,0,0.18)]"
        onSubmit={(event) => {
          event.preventDefault();
          if (step === "identifier") {
            void sendCode();
            return;
          }
          void verifyCode();
        }}
      >
        <button
          type="button"
          aria-label="Close"
          className="absolute top-5 right-5 flex h-8 w-8 items-center justify-center text-foreground"
          onClick={close}
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
            <path d="M1 1l12 12M13 1 1 13" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
          </svg>
        </button>
        <LogoMark className="mx-auto h-11 w-11 text-foreground" />
        <h2 id="sign-in-heading" className="mt-4 text-center text-[22px] font-semibold tracking-tight">
          {heading}
        </h2>
        {step === "identifier" ? (
          <label className="mt-7 block">
            <span className="sr-only">Phone number or email</span>
            <input
              value={identifier}
              onChange={(event) => setIdentifier(event.target.value)}
              className="w-full rounded-xl border border-[#b0b0b0] px-4 py-3.5 text-[15px] outline-none placeholder:text-[#9a9a9a] focus:border-foreground"
              placeholder="Phone number or email"
              type="text"
              autoComplete="username"
              autoFocus
            />
          </label>
        ) : (
          <label className="mt-7 block">
            <span className="sr-only">Verification code</span>
            <input
              value={code}
              onChange={(event) => setCode(event.target.value)}
              className="w-full rounded-xl border border-[#b0b0b0] px-4 py-3.5 text-[15px] outline-none placeholder:text-[#9a9a9a] focus:border-foreground"
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
          className="mt-4 w-full rounded-xl bg-foreground py-3.5 text-[16px] font-semibold text-white disabled:opacity-40"
          disabled={busy}
        >
          Continue
        </button>
        {step === "code" ? (
          <button
            type="button"
            className="mt-4 w-full text-sm text-muted"
            onClick={() => {
              setStep("identifier");
              setCode("");
              setLocalError(null);
            }}
          >
            Use a different phone number or email
          </button>
        ) : (
          <>
            <div className="my-5 flex items-center gap-4 text-[13px] text-muted">
              <span className="h-px flex-1 bg-line" />
              or
              <span className="h-px flex-1 bg-line" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                aria-label="Continue with Google"
                className="flex h-14 items-center justify-center rounded-xl border border-[#dddddd] bg-white disabled:opacity-40"
                disabled={busy}
                onClick={() => void signInWith("oauth_google")}
              >
                <GoogleMark />
              </button>
              <button
                type="button"
                aria-label="Continue with Apple"
                className="flex h-14 items-center justify-center rounded-xl border border-[#dddddd] bg-white disabled:opacity-40"
                disabled={busy}
                onClick={() => void signInWith("oauth_apple")}
              >
                <AppleMark />
              </button>
            </div>
          </>
        )}
        <div id="clerk-captcha" className="mt-4" />
      </form>
    </div>
  );
}
