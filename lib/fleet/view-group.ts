import { cookies } from "next/headers";
import { prisma } from "@/lib/db/client";

/**
 * The dispatch group currently being viewed — a display filter, not a
 * permission. Everything derived from a depot (board, week, drivers, trucks,
 * leave, compliance, reports) narrows to the selected group; `null` means all
 * groups, the whole-business view.
 *
 * Deliberately separate from depot SCOPE (lib/auth/scope.ts): scope is what a
 * user is ALLOWED to change, this is what they're CHOOSING to look at.
 * Narrowing the view never widens permission.
 */

export const VIEW_GROUP_COOKIE = "hfleet_group";

export interface DispatchGroupVM {
  code: string;
  name: string;
  state: string;
  depots: number;
}

/** The selected dispatch group code, or null for all. */
export async function getViewGroup(): Promise<string | null> {
  const raw = (await cookies()).get(VIEW_GROUP_COOKIE)?.value?.trim().toUpperCase();
  if (!raw || raw === "ALL") return null;
  // Only honour a group that still exists, so a stale cookie can't silently
  // empty every screen.
  const exists = await prisma.dispatchGroup.count({ where: { code: raw, isActive: true } });
  return exists > 0 ? raw : null;
}

/**
 * Groups worth OFFERING in the selector: active, and actually running depots.
 * A group seeded ahead of its data would otherwise sit there as a dead option
 * that empties every screen when picked. Depots admin lists all of them, so
 * you can still assign depots to a group before it has any.
 */
export async function availableGroups(): Promise<DispatchGroupVM[]> {
  const rows = await prisma.dispatchGroup.findMany({
    where: { isActive: true, depots: { some: {} } },
    orderBy: [{ sortOrder: "asc" }, { code: "asc" }],
    include: { _count: { select: { depots: true } } },
  });
  return rows.map((g) => ({ code: g.code, name: g.name, state: g.state, depots: g._count.depots }));
}

/**
 * The Prisma `where` fragment for a depot-derived query. Returns `{}` for the
 * all-groups view so callers can spread it unconditionally.
 */
export function depotWhereForGroup(group: string | null) {
  return group === null ? {} : { dispatchGroupCode: group };
}
