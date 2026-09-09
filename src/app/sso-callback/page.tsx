"use client";

import { useClerk, useSignIn, useSignUp } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";
import { LogoMark } from "@/components/Logo";
import { safeAppPath } from "@/lib/auth-redirect";

function goTo(
  router: ReturnType<typeof useRouter>,
  decorateUrl: (path: string) => string,
  path: string,
) {
  const url = decorateUrl(path);
  if (url.startsWith("http")) {
    window.location.href = url;
    return;
  }
  router.push(url);
}

export default function SsoCallbackPage() {
  const clerk = useClerk();
  const { signIn } = useSignIn();
  const { signUp } = useSignUp();
  const router = useRouter();
  const hasRun = useRef(false);

  useEffect(() => {
    void (async () => {
      if (!clerk.loaded || hasRun.current) {
        return;
      }
      hasRun.current = true;
      const returnPath = safeAppPath(new URLSearchParams(window.location.search).get("redirect_url"));

      const navigateHome = async ({
        session,
        decorateUrl,
      }: {
        session?: { currentTask?: { key: string } | null } | null;
        decorateUrl: (path: string) => string;
      }) => {
        if (session?.currentTask) {
          return;
        }
        goTo(router, decorateUrl, returnPath);
      };

      async function finalizeSignIn() {
        await signIn.finalize({ navigate: navigateHome });
      }

      async function finalizeSignUp() {
        await signUp.finalize({ navigate: navigateHome });
      }

      if (signIn.status === "complete") {
        await finalizeSignIn();
        return;
      }

      if (signUp.isTransferable) {
        await signIn.create({ transfer: true });
        const signInStatus = signIn.status as typeof signIn.status | "complete";
        if (signInStatus === "complete") {
          await finalizeSignIn();
          return;
        }
        router.push(returnPath);
        return;
      }

      if (
        signIn.status === "needs_first_factor" &&
        !signIn.supportedFirstFactors?.every((factor) => factor.strategy === "enterprise_sso")
      ) {
        router.push(returnPath);
        return;
      }

      if (signIn.isTransferable) {
        await signUp.create({ transfer: true });
        if (signUp.status === "complete") {
          await finalizeSignUp();
          return;
        }
        router.push(returnPath);
        return;
      }

      if (signUp.status === "complete") {
        await finalizeSignUp();
        return;
      }

      if (signIn.status === "needs_second_factor" || signIn.status === "needs_new_password") {
        router.push(returnPath);
        return;
      }

      if (signIn.existingSession || signUp.existingSession) {
        const sessionId = signIn.existingSession?.sessionId || signUp.existingSession?.sessionId;
        if (sessionId) {
          await clerk.setActive({
            session: sessionId,
            navigate: navigateHome,
          });
        }
      }
    })();
  }, [clerk, router, signIn, signUp]);

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-4">
      <LogoMark className="h-11 w-11 text-foreground" />
      <p className="text-sm text-muted">Finishing sign-in…</p>
      <div id="clerk-captcha" />
    </div>
  );
}
