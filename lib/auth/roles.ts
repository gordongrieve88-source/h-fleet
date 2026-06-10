/**
 * Roles, from least to most privileged:
 *   STAFF      — view only
 *   SUPERVISOR — STAFF, plus may edit the board, fleet master data and Setup
 *                and approve driver leave. Does NOT see the management
 *                insights (Fleet reports).
 *   MANAGER    — full access to everything, including the insights screens
 *                (Fleet reports).
 *
 * Stored on AppUser.role; in production derived from the Entra ID account.
 */
export const ROLES = {
  STAFF: "STAFF",
  SUPERVISOR: "SUPERVISOR",
  MANAGER: "MANAGER",
} as const;

export type Role = (typeof ROLES)[keyof typeof ROLES];

/** Supervisor and Manager may edit the board / fleet data / Setup. */
export function isEditRole(role: string | null | undefined): boolean {
  return role === ROLES.SUPERVISOR || role === ROLES.MANAGER;
}

/** Supervisor and Manager may approve driver leave and use the planner. */
export function isApproverRole(role: string | null | undefined): boolean {
  return role === ROLES.SUPERVISOR || role === ROLES.MANAGER;
}

/** Only Manager sees the management insights (Fleet reports). */
export function isInsightsRole(role: string | null | undefined): boolean {
  return role === ROLES.MANAGER;
}

/** Full label for menus, e.g. the role switcher. */
export function roleLabel(role: string): string {
  switch (role) {
    case ROLES.MANAGER:
      return "Manager";
    case ROLES.SUPERVISOR:
      return "Supervisor";
    case ROLES.STAFF:
      return "Staff";
    default:
      return role;
  }
}

/** Short label for the access badge. */
export function roleAccessLabel(role: string): string {
  if (isInsightsRole(role)) return "Full access";
  if (isEditRole(role)) return "Edit";
  return "View only";
}
