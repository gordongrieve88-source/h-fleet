import { ROLES, isEditRole } from "./roles";

/**
 * Per-depot permission scope. A SUPERVISOR can be limited to specific depots
 * (UserDepotScope rows); everything they edit — board moves, truck statuses,
 * leave, master data — must belong to one of them.
 *
 * `null` means unrestricted:
 *   - MANAGER is always unrestricted;
 *   - a SUPERVISOR with NO scope rows is unrestricted too (scoping is an
 *     opt-in restriction, so existing unscoped supervisors keep working).
 * A non-edit role resolves to [] — no depots, ever.
 */
export function resolveDepotScope(role: string, scopedDepotIds: number[]): number[] | null {
  if (role === ROLES.MANAGER) return null;
  if (!isEditRole(role)) return [];
  if (scopedDepotIds.length === 0) return null;
  return scopedDepotIds;
}

/** May a user with this resolved scope act on this depot? */
export function depotInScope(scope: number[] | null, depotId: number): boolean {
  return scope === null || scope.includes(depotId);
}
