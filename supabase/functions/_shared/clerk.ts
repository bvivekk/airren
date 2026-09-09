import { createLocalJWKSet, decodeJwt, decodeProtectedHeader, jwtVerify } from "npm:jose@5";

export type ClerkIdentity = {
  sub: string;
  token: string;
};

const clerkFrontendIssuer = "https://perfect-honeybee-8505.clerk.accounts.dev";

type ClerkJwk = JsonWebKey & { kid?: string; alg?: string };

function normalizeIssuer(value: string): string {
  return value.replace(/\/$/, "");
}

function allowedIssuers(): Set<string> {
  const issuers = new Set([clerkFrontendIssuer]);
  const fromEnv = Deno.env.get("CLERK_JWT_ISSUER");
  if (fromEnv) {
    issuers.add(normalizeIssuer(fromEnv));
  }
  return issuers;
}

function bearerToken(req: Request): string {
  const header = req.headers.get("Authorization") ?? "";
  return header.startsWith("Bearer ") ? header.slice(7) : "";
}

async function loadClerkJwks(issuer: string): Promise<{ keys: ClerkJwk[] }> {
  const response = await fetch(`${issuer}/.well-known/jwks.json`, {
    headers: { Accept: "application/json" },
  });
  if (!response.ok) {
    throw new Error("signed in guest required");
  }
  const body = (await response.json()) as { keys?: ClerkJwk[] };
  if (!Array.isArray(body.keys) || body.keys.length === 0) {
    throw new Error("signed in guest required");
  }
  return { keys: body.keys };
}

async function verifyClerkToken(token: string, issuer: string) {
  const jwks = await loadClerkJwks(issuer);
  try {
    return await jwtVerify(token, createLocalJWKSet(jwks), {
      issuer,
      algorithms: ["RS256", "ES256", "EdDSA"],
    });
  } catch (error) {
    console.error("clerk jwks verify failed", error instanceof Error ? error.message : error);
    const header = decodeProtectedHeader(token);
    const jwk = jwks.keys.find((key) => key.kid === header.kid);
    if (!jwk || header.alg !== "RS256") {
      throw new Error("signed in guest required");
    }
    const key = await crypto.subtle.importKey(
      "jwk",
      jwk,
      { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
      false,
      ["verify"],
    );
    return await jwtVerify(token, key, { issuer, algorithms: ["RS256"] });
  }
}

export async function requireClerkUser(req: Request): Promise<ClerkIdentity> {
  const token = bearerToken(req);
  if (!token) {
    throw new Error("signed in guest required");
  }

  let issuer = "";
  try {
    const unverified = decodeJwt(token);
    if (typeof unverified.iss !== "string" || unverified.iss.length === 0) {
      throw new Error("signed in guest required");
    }
    issuer = normalizeIssuer(unverified.iss);
    if (!allowedIssuers().has(issuer)) {
      throw new Error("signed in guest required");
    }
  } catch (error) {
    if (error instanceof Error && error.message === "signed in guest required") {
      throw error;
    }
    throw new Error("signed in guest required");
  }

  try {
    const { payload } = await verifyClerkToken(token, issuer);
    if (typeof payload.sub !== "string" || payload.sub.length === 0) {
      throw new Error("signed in guest required");
    }
    return { sub: payload.sub, token };
  } catch (error) {
    console.error("clerk jwt verify failed", error instanceof Error ? error.message : error);
    throw new Error("signed in guest required");
  }
}
