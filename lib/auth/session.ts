import { SignJWT, jwtVerify, type JWTPayload } from "jose";

/**
 * Stateless sessions: a signed (HS256) JWT in an httpOnly cookie. Pure
 * functions only — cookie reads/writes stay with the callers (route handlers,
 * the proxy, lib/auth/index) so this module works in every runtime.
 */

const ISSUER = "h-fleet";

async function seal(claims: JWTPayload, secret: Uint8Array, maxAgeSeconds: number): Promise<string> {
  return new SignJWT(claims)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuer(ISSUER)
    .setAudience(ISSUER)
    .setIssuedAt()
    .setExpirationTime(Math.floor(Date.now() / 1000) + maxAgeSeconds)
    .sign(secret);
}

async function open(token: string, secret: Uint8Array): Promise<JWTPayload | null> {
  try {
    const { payload } = await jwtVerify(token, secret, { issuer: ISSUER, audience: ISSUER });
    return payload;
  } catch {
    return null; // expired, tampered, or from a rotated secret — all just "not signed in"
  }
}

// ---- the signed-in session --------------------------------------------------

export interface Session {
  userId: number;
}

export function sealSession(userId: number, secret: Uint8Array, maxAgeSeconds: number): Promise<string> {
  return seal({ sub: String(userId) }, secret, maxAgeSeconds);
}

export async function openSession(token: string, secret: Uint8Array): Promise<Session | null> {
  const payload = await open(token, secret);
  const userId = Number(payload?.sub);
  return payload && Number.isInteger(userId) && userId > 0 ? { userId } : null;
}

// ---- the transient login-flow state (state/PKCE/nonce between redirects) ----

export interface LoginState {
  state: string;
  verifier: string;
  nonce: string;
  returnTo: string;
}

const LOGIN_STATE_MAX_AGE = 600; // ten minutes to round-trip through Entra

export function sealLoginState(s: LoginState, secret: Uint8Array): Promise<string> {
  return seal({ st: s.state, cv: s.verifier, no: s.nonce, rt: s.returnTo }, secret, LOGIN_STATE_MAX_AGE);
}

export async function openLoginState(token: string, secret: Uint8Array): Promise<LoginState | null> {
  const p = await open(token, secret);
  if (!p || typeof p.st !== "string" || typeof p.cv !== "string" || typeof p.no !== "string") return null;
  return { state: p.st, verifier: p.cv, nonce: p.no, returnTo: typeof p.rt === "string" ? p.rt : "/" };
}
