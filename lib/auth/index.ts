import { cookies } from "next/headers";
import { prisma } from "@/lib/db/client";
import { ROLES, isEditRole, isApproverRole, isInsightsRole, type Role } from "./roles";
import type { AppUser } from "@/generated/prisma/client";

/**
 * ===========================================================================
 *  SEAM — AUTHENTICATION & AUTHORISATION
 * ===========================================================================
 *  The ONE module that knows "who is signed in". Everything else asks here.
 *
 *  DEMO: the role switcher stores a user id in an http-only cookie.
 *  PRODUCTION (Azure/Entra): replace ONLY the body of getCurrentUser() —
 *  read the Entra identity and look up the AppUser via entraObjectId. Every
 *  caller stays identical.
 * ===========================================================================
 */

export const DEMO_USER_COOKIE = "hfleet_user_id";

export async function getCurrentUser(): Promise<AppUser | null> {
  const store = await cookies();
  const raw = store.get(DEMO_USER_COOKIE)?.value;
  const users = await prisma.appUser.findMany({ where: { isActive: true } });
  if (users.length === 0) return null;
  if (raw) {
    const match = users.find((u) => u.id === Number(raw));
    if (match) return match;
  }
  // Default to a view-only Staff login so demos start from least privilege.
  return users.find((u) => u.role === ROLES.STAFF) ?? users[0];
}

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

/** Demo-only: users offered by the role switcher. */
export function listDemoUsers() {
  return prisma.appUser.findMany({ where: { isActive: true }, orderBy: { id: "asc" } });
}
