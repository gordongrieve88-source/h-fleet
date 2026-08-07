import { cache } from "react";
import { cookies } from "next/headers";
import { prisma } from "@/lib/db/client";
import { ROLES, isEditRole, isApproverRole, isInsightsRole, type Role } from "./roles";
import { authMode, sessionSecretKey, SESSION_COOKIE } from "./config";
import { openSession } from "./session";
import { resolveDepotScope, depotInScope } from "./scope";
import type { AppUser } from "@/generated/prisma/client";

/**
 * ===========================================================================
 *  SEAM — AUTHENTICATION & AUTHORISATION
 * ===========================================================================
 *  The ONE module that knows "who is signed in". Everything else asks here.
 *
 *  Two modes, switched by AUTH_MODE in config (no code change):
 *    demo   — the role switcher stores a user id in an http-only cookie.
 *    entra  — Microsoft Entra ID sign-in; /auth/* handlers put a signed
 *             session JWT in a cookie, this module verifies it and loads the
 *             AppUser it names. See lib/auth/entra.ts.
 *  Every caller stays identical in both modes.
 * ===========================================================================
 */

export const DEMO_USER_COOKIE = "hfleet_user_id";

/** Cached per request — layouts, pages and guards share one lookup. */
export const getCurrentUser = cache(async (): Promise<AppUser | null> => {
  const store = await cookies();

  if (authMode() === "entra") {
    const raw = store.get(SESSION_COOKIE)?.value;
    const session = raw ? await openSession(raw, sessionSecretKey()) : null;
    if (!session) return null;
    const user = await prisma.appUser.findUnique({ where: { id: session.userId } });
    return user?.isActive ? user : null;
  }

  // Demo: cookie picks a seeded user; default to least privilege (Staff).
  const raw = Number(store.get(DEMO_USER_COOKIE)?.value);
  if (Number.isInteger(raw) && raw > 0) {
    const picked = await prisma.appUser.findUnique({ where: { id: raw } });
    if (picked?.isActive) return picked;
  }
  return (
    (await prisma.appUser.findFirst({ where: { isActive: true, role: ROLES.STAFF }, orderBy: { id: "asc" } })) ??
    (await prisma.appUser.findFirst({ where: { isActive: true }, orderBy: { id: "asc" } }))
  );
});

export async function getRole(): Promise<Role | null> {
  const user = await getCurrentUser();
  return (user?.role as Role) ?? null;
}

export async function canEdit(): Promise<boolean> {
  return isEditRole((await getCurrentUser())?.role);
}

export async function canApprove(): Promise<boolean> {
  return isApproverRole((await getCurrentUser())?.role);
}

export async function canInsights(): Promise<boolean> {
  return isInsightsRole((await getCurrentUser())?.role);
}

/** Guard for every write path. Throws unless Supervisor/Manager. */
export async function requireEdit(): Promise<AppUser> {
  const user = await getCurrentUser();
  if (!isEditRole(user?.role)) {
    throw new Error("Forbidden: this action requires Supervisor or Manager access.");
  }
  return user as AppUser;
}

/** Guard for approvals. Throws unless Supervisor/Manager. */
export async function requireApprover(): Promise<AppUser> {
  const user = await getCurrentUser();
  if (!isApproverRole(user?.role)) {
    throw new Error("Forbidden: this action requires Supervisor or Manager access.");
  }
  return user as AppUser;
}

/** Guard for org-wide structure and Setup. Managers only. */
export async function requireManager(): Promise<AppUser> {
  const user = await getCurrentUser();
  if (user?.role !== ROLES.MANAGER) {
    throw new Error("Forbidden: this action requires Manager access.");
  }
  return user;
}

// ---------------------------------------------------------------------------
//  Per-depot scope (see lib/auth/scope.ts for the semantics)
// ---------------------------------------------------------------------------

/**
 * Depot ids this user may act on; null = unrestricted. Pass a user to check
 * someone specific (tests do), otherwise the signed-in user is used — a
 * signed-out request gets an empty scope (nothing allowed).
 */
export async function getDepotScope(user?: AppUser | null): Promise<number[] | null> {
  const u = user === undefined ? await getCurrentUser() : user;
  if (!u) return [];
  const rows = await prisma.userDepotScope.findMany({ where: { userId: u.id }, select: { depotId: true } });
  return resolveDepotScope(u.role, rows.map((r) => r.depotId));
}

/** requireEdit + the target depot must be inside the user's scope. */
export async function requireEditForDepot(depotId: number, user?: AppUser): Promise<AppUser> {
  const u = user ?? (await requireEdit());
  if (!isEditRole(u.role)) {
    throw new Error("Forbidden: this action requires Supervisor or Manager access.");
  }
  if (!depotInScope(await getDepotScope(u), depotId)) {
    throw new Error("Forbidden: that depot is outside your access.");
  }
  return u;
}

/** requireEdit + an unrestricted scope — for actions that sweep every depot
 *  at once (e.g. resetting a whole board day). */
export async function requireUnrestrictedEdit(): Promise<AppUser> {
  const u = await requireEdit();
  if ((await getDepotScope(u)) !== null) {
    throw new Error("Forbidden: this action affects every depot and needs unrestricted access.");
  }
  return u;
}

/** Demo-only: users offered by the role switcher. */
export function listDemoUsers() {
  return prisma.appUser.findMany({ where: { isActive: true }, orderBy: { id: "asc" } });
}
