import * as oidc from "openid-client";
import { prisma } from "@/lib/db/client";
import type { AppUser } from "@/generated/prisma/client";
import { profileFromClaims } from "./entra-profile";
import type { LoginState } from "./session";

/**
 * Microsoft Entra ID sign-in: OIDC authorization-code flow with PKCE via
 * openid-client. Used only by the /auth/* route handlers when
 * AUTH_MODE=entra.
 *
 * Environment (see deploy/h-fleet.env.example):
 *   ENTRA_TENANT_ID     directory (tenant) id
 *   ENTRA_CLIENT_ID     app registration's application (client) id
 *   ENTRA_CLIENT_SECRET client secret
 *   ENTRA_REDIRECT_URI  https://<host>/auth/callback — must match the app
 *                       registration exactly
 */

function requiredEnv(name: string): string {
  const v = process.env[name]?.trim();
  if (!v) throw new Error(`${name} is required when AUTH_MODE=entra (see deploy/h-fleet.env.example).`);
  return v;
}

export function entraRedirectUri(): string {
  return requiredEnv("ENTRA_REDIRECT_URI");
}

// Discovery hits the network once; cache the configuration for the process.
let configPromise: Promise<oidc.Configuration> | null = null;
function entraConfiguration(): Promise<oidc.Configuration> {
  configPromise ??= oidc.discovery(
    new URL(`https://login.microsoftonline.com/${requiredEnv("ENTRA_TENANT_ID")}/v2.0`),
    requiredEnv("ENTRA_CLIENT_ID"),
    requiredEnv("ENTRA_CLIENT_SECRET"),
  );
  return configPromise;
}

/** Build the Entra authorization URL + the transient state to remember. */
export async function beginLogin(returnTo: string): Promise<{ url: URL; loginState: LoginState }> {
  const config = await entraConfiguration();
  const verifier = oidc.randomPKCECodeVerifier();
  const loginState: LoginState = {
    state: oidc.randomState(),
    verifier,
    nonce: oidc.randomNonce(),
    returnTo,
  };
  const url = oidc.buildAuthorizationUrl(config, {
    redirect_uri: entraRedirectUri(),
    scope: "openid profile email",
    state: loginState.state,
    nonce: loginState.nonce,
    code_challenge: await oidc.calculatePKCECodeChallenge(verifier),
    code_challenge_method: "S256",
  });
  return { url, loginState };
}

export type LoginOutcome = { ok: true; user: AppUser } | { ok: false; reason: "disabled" | "invalid" };

/**
 * Exchange the callback for tokens, validate them, and resolve the AppUser.
 * Matching order: entraObjectId, then email (links pre-provisioned accounts
 * on first sign-in), then just-in-time creation. When the token carries app
 * roles they are the source of truth for AppUser.role on every sign-in.
 */
export async function completeLogin(callbackUrl: URL, loginState: LoginState): Promise<LoginOutcome> {
  const config = await entraConfiguration();
  const tokens = await oidc.authorizationCodeGrant(config, callbackUrl, {
    pkceCodeVerifier: loginState.verifier,
    expectedState: loginState.state,
    expectedNonce: loginState.nonce,
  });
  const claims = tokens.claims();
  const profile = claims ? profileFromClaims(claims) : null;
  if (!profile) return { ok: false, reason: "invalid" };

  const existing =
    (await prisma.appUser.findUnique({ where: { entraObjectId: profile.oid } })) ??
    (profile.email ? await prisma.appUser.findUnique({ where: { email: profile.email } }) : null);

  if (existing && !existing.isActive) return { ok: false, reason: "disabled" };

  const user = existing
    ? await prisma.appUser.update({
        where: { id: existing.id },
        data: {
          entraObjectId: profile.oid,
          displayName: profile.displayName,
          email: profile.email ?? existing.email,
          ...(profile.role ? { role: profile.role } : {}),
        },
      })
    : await prisma.appUser.create({
        data: {
          entraObjectId: profile.oid,
          displayName: profile.displayName,
          email: profile.email,
          role: profile.role ?? "STAFF",
        },
      });

  if (!existing) {
    await prisma.auditLog.create({
      data: {
        userId: user.id,
        userName: user.displayName,
        action: "auth.provision",
        entity: "AppUser",
        entityId: user.id,
        summary: `First Entra ID sign-in — created account for ${user.displayName} (${user.role})`,
      },
    });
  }
  return { ok: true, user };
}
