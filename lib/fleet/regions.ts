/**
 * Regions belong to a dispatch group — each group runs its own operating map,
 * so the depot editor only offers the regions of the group being assigned.
 */

export interface RegionChoice {
  name: string;
  groupCode: string | null;
}

/**
 * The regions on offer for a dispatch group. A region with no group is
 * legacy/shared and stays available everywhere; the depot's current region is
 * always kept on the list, so editing an unrelated field can never silently
 * move a depot out of the region it's actually in.
 *
 * No group chosen means no filter — a depot outside every group can sit in any
 * region, and hiding them all would just look like the fleet has no regions.
 */
export function regionsForGroup<T extends RegionChoice>(
  regions: T[],
  groupCode: string | null,
  currentRegion: string | null = null,
): T[] {
  if (!groupCode) return regions;
  return regions.filter((r) => r.groupCode === groupCode || r.groupCode === null || r.name === currentRegion);
}
