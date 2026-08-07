/**
 * Auth configuration — resolved from the environment (locally .env, on the
 * RHEL8 box the stored config file /etc/h-fleet/h-fleet.env).
 *
 *   AUTH_MODE=demo   (default) cookie role-switcher, seeded users
 *   AUTH_MODE=entra  Microsoft Entra ID sign-in (OIDC); see lib/auth/entra.ts
 */

export type AuthMode = "demo" | "entra";

export function authMode(): AuthMode {
  return process.env.AUTH_MODE === "entra" ? "entra" : "demo";
}

/** Session cookie names live here so app code and the proxy agree. */
export const SESSION_COOKIE = "hfleet_session";
export const LOGIN_STATE_COOKIE = "hfleet_login";
export const WALLBOARD_COOKIE = "hfleet_wallboard";

// Demo fallback only — entra mode refuses to run without a real secret.
const DEMO_SECRET = "h-fleet-demo-secret-not-for-production-use!";

/** HMAC key for the session JWT. In entra mode SESSION_SECRET is mandatory. */
export function sessionSecretKey(): Uint8Array {
  const raw = process.env.SESSION_SECRET;
  if (raw && raw.length >= 32) return new TextEncoder().encode(raw);
  if (authMode() === "entra") {
    throw new Error("SESSION_SECRET (>= 32 chars) is required when AUTH_MODE=entra. Generate one: openssl rand -base64 48");
  }
  return new TextEncoder().encode(DEMO_SECRET);
}

/** Session lifetime; after this the user round-trips through Entra again. */
export function sessionMaxAgeSeconds(): number {
  const hours = Number(process.env.SESSION_MAX_AGE_HOURS ?? 12);
  return (Number.isFinite(hours) && hours > 0 ? hours : 12) * 3600;
}

/** Static access token for wallboard TVs, which can't do interactive SSO. */
export function wallboardToken(): string | null {
  const t = process.env.WALLBOARD_TOKEN?.trim();
  return t && t.length >= 16 ? t : null;
}
