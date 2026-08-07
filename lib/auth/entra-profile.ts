import { ROLES, type Role } from "./roles";

/**
 * Pure mapping from Entra ID token claims to an H-Fleet profile. Kept free of
 * openid-client so it can be unit-tested and reused.
 *
 * Roles come from APP ROLES on the Entra app registration (the `roles`
 * claim): create roles named Manager / Supervisor / Staff and assign users or
 * AD groups to them in the portal. If the token carries no roles claim the
 * app keeps whatever role the AppUser already has (pre-provisioned accounts),
 * defaulting to STAFF for brand-new sign-ins — least privilege either way.
 */

export interface EntraProfile {
  oid: string;
  displayName: string;
  email: string | null;
  /** null = no roles claim in the token; keep the stored role. */
  role: Role | null;
}

export function roleFromClaims(roles: unknown): Role | null {
  if (!Array.isArray(roles) || roles.length === 0) return null;
  const names = roles.filter((r): r is string => typeof r === "string").map((r) => r.trim().toUpperCase());
  if (names.includes(ROLES.MANAGER)) return ROLES.MANAGER;
  if (names.includes(ROLES.SUPERVISOR)) return ROLES.SUPERVISOR;
  return ROLES.STAFF;
}

export function profileFromClaims(claims: Record<string, unknown>): EntraProfile | null {
  const oid = claims.oid;
  if (typeof oid !== "string" || oid.length === 0) return null;

  const preferred = typeof claims.preferred_username === "string" ? claims.preferred_username : null;
  const explicitEmail = typeof claims.email === "string" ? claims.email : null;
  const email = explicitEmail ?? (preferred?.includes("@") ? preferred : null);

  const name = typeof claims.name === "string" && claims.name.trim() ? claims.name.trim() : null;
  const displayName = name ?? preferred ?? email ?? oid;

  return { oid, displayName, email, role: roleFromClaims(claims.roles) };
}
