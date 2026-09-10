import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { channelConnections } from "@/lib/channels";
import { safeAppPath } from "@/lib/auth-redirect";
import { createServerClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const session = await auth();
  const hostId = session.userId;
  if (!hostId) {
    redirect("/");
  }
  const outcome = await channelConnections(createServerClient()).finishAirbnb({
    callbackUrl: request.url,
    requestedBy: { hostId },
  });
  const returnTo = safeAppPath(outcome.returnTo);
  const next = new URL(returnTo === "/" ? "/host/listings" : returnTo, request.url);
  next.searchParams.set("channel", outcome.connectionId);
  return Response.redirect(next);
}

export const dynamic = "force-dynamic";
