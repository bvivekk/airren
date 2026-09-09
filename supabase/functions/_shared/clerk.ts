import { createRemoteJWKSet, jwtVerify } from "npm:jose@5";

export type ClerkIdentity = {
  sub: string;
  token: string;
};

export async function requireClerkUser(req: Request): Promise<ClerkIdentity> {
  const header = req.headers.get("Authorization") ?? "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";
  if (!token) {
    throw new Error("signed in guest required");
  }
  const issuer = Deno.env.get("CLERK_JWT_ISSUER");
  if (!issuer) {
    throw new Error("CLERK_JWT_ISSUER is not set");
  }
  const jwks = createRemoteJWKSet(new URL(`${issuer.replace(/\/$/, "")}/.well-known/jwks.json`));
  const { payload } = await jwtVerify(token, jwks, { issuer });
  if (typeof payload.sub !== "string" || payload.sub.length === 0) {
    throw new Error("signed in guest required");
  }
  return { sub: payload.sub, token };
}
