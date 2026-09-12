import { safeAppPath } from "./auth-redirect.ts";

export type ApexHost = string & { readonly __brand: "ApexHost" };
export type HttpsOrigin = string & { readonly __brand: "HttpsOrigin" };
export type WwwHost = string & { readonly __brand: "WwwHost" };
export type Mailbox = string & { readonly __brand: "Mailbox" };

export type PublicSite = {
  readonly apex: ApexHost;
  readonly origin: HttpsOrigin;
  readonly hello: Mailbox;
};

export class InvalidApexError extends Error {
  readonly name = "InvalidApexError";

  constructor(message = "NEXT_PUBLIC_AIRREN_APEX must be a bare apex hostname") {
    super(message);
  }
}

const LABEL = /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/;
const IPV4 = /^(?:\d{1,3}\.){3}\d{1,3}$/;

function asApex(value: string): ApexHost {
  return value as ApexHost;
}

function asOrigin(value: string): HttpsOrigin {
  return value as HttpsOrigin;
}

function asMailbox(value: string): Mailbox {
  return value as Mailbox;
}

function asWww(value: string): WwwHost {
  return value as WwwHost;
}

export function parsePublicSite(rawApex: unknown): PublicSite {
  if (typeof rawApex !== "string") {
    throw new InvalidApexError();
  }

  const apex = rawApex.trim().toLowerCase();
  if (
    !apex ||
    apex.length > 253 ||
    apex.includes("://") ||
    apex.includes("/") ||
    apex.includes(":") ||
    apex.includes("?") ||
    apex.includes("#") ||
    apex.includes("@") ||
    apex.includes("\\") ||
    apex.endsWith(".") ||
    apex.startsWith("www.") ||
    apex === "localhost" ||
    apex.endsWith(".localhost") ||
    apex.endsWith(".vercel.app") ||
    IPV4.test(apex)
  ) {
    throw new InvalidApexError();
  }

  const labels = apex.split(".");
  if (labels.length < 2 || labels.some((label) => !LABEL.test(label))) {
    throw new InvalidApexError();
  }

  return {
    apex: asApex(apex),
    origin: asOrigin(`https://${apex}`),
    hello: asMailbox(`hello@${apex}`),
  };
}

type SiteEnv = {
  readonly NEXT_PUBLIC_AIRREN_APEX?: unknown;
};

export function publicSite(env: SiteEnv = process.env as SiteEnv): PublicSite {
  return parsePublicSite(env.NEXT_PUBLIC_AIRREN_APEX);
}

export function originUrl(site: PublicSite): URL {
  return new URL(`${site.origin}/`);
}

export function canonicalUrl(site: PublicSite, rawPath: string): string {
  const path = safeAppPath(rawPath);
  return path === "/" ? `${site.origin}/` : `${site.origin}${path}`;
}

export function wwwHost(site: PublicSite): WwwHost {
  return asWww(`www.${site.apex}`);
}
