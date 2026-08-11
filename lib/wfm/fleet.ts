/**
 * Fleet domain constants + board maths. Truck status codes carry over from
 * the original HMA Metro Roster spreadsheet — the dispatchers already speak
 * this language, so the codes are the UI.
 */

export const TRUCK_STATUS = {
  ON: { code: "ON", label: "On road", kind: "on" },
  "ON-LS": { code: "ON-LS", label: "Late start", kind: "on" },
  "ON-EF": { code: "ON-EF", label: "Early finish", kind: "on" },
  "ON-SER": { code: "ON-SER", label: "Service — late start / early finish", kind: "warn" },
  "ON-DED": { code: "ON-DED", label: "Dedag — late start / early finish", kind: "warn" },
  OFF: { code: "OFF", label: "Off", kind: "off" },
  "OFF-BD": { code: "OFF-BD", label: "Breakdown", kind: "off" },
  "OFF-ND": { code: "OFF-ND", label: "Driver not in / leave", kind: "off" },
  "OFF-NR": { code: "OFF-NR", label: "Not required", kind: "off" },
  "OFF-PAR": { code: "OFF-PAR", label: "Parked up", kind: "off" },
} as const;

export type TruckStatusCode = keyof typeof TRUCK_STATUS;
export const TRUCK_STATUS_CODES = Object.keys(TRUCK_STATUS) as TruckStatusCode[];

/**
 * Statuses that carry a planned time entered by transport: a late start's
 * planned start, an early finish's finish, and service/dedag which can be
 * either. The label says which the time field means.
 */
export const TIMED_STATUS: Record<string, string> = {
  "ON-LS": "planned start",
  "ON-EF": "planned finish",
  "ON-SER": "start / finish time",
  "ON-DED": "start / finish time",
};

export function statusKind(code: string): "on" | "warn" | "off" {
  const s = (TRUCK_STATUS as Record<string, { kind: string }>)[code.trim().toUpperCase()];
  return (s?.kind as "on" | "warn" | "off") ?? "on";
}

export function statusLabel(code: string): string {
  const s = (TRUCK_STATUS as Record<string, { label: string }>)[code.trim().toUpperCase()];
  return s?.label ?? code;
}

/** "On road" for availability = any ON* code. */
export function isOnRoad(code: string): boolean {
  return code.trim().toUpperCase().startsWith("ON");
}

/** Alphanumeric fleet-code order — PCC2044 before PCC2088 before PLC2603. */
export function truckOrder(a: string, b: string): number {
  return a.localeCompare(b, undefined, { numeric: true, sensitivity: "base" });
}

/**
 * First-truck-out cycling: the fleet runs a first-in-first-out cyclical
 * roster per plant — if 1111 leads today, 2222 leads tomorrow. Given the
 * block's trucks in alphanumeric order, the previous FTO and how many days
 * have passed, pick today's FTO: advance one position per day, then walk
 * forward to the first truck that's actually on road (a broken-down or
 * parked truck misses its turn). Null when nothing is on road.
 */
export function nextFto(
  sortedTrucks: string[],
  prevFto: string | null,
  daysSince: number,
  isOn: (truck: string) => boolean,
): string | null {
  const n = sortedTrucks.length;
  if (n === 0) return null;
  const prevIdx = prevFto ? sortedTrucks.findIndex((t) => truckOrder(t, prevFto) === 0) : -1;
  const start = prevIdx === -1 ? 0 : (prevIdx + Math.max(1, daysSince)) % n;
  for (let k = 0; k < n; k++) {
    const cand = sortedTrucks[(start + k) % n];
    if (isOn(cand)) return cand;
  }
  return null;
}

/**
 * A block's board rows in FTO order: alphanumeric, rotated so the first
 * truck out leads and the sequence follows on from there.
 */
export function ftoRotate<T extends { truck: string; fto: boolean }>(rows: T[]): T[] {
  const sorted = [...rows].sort((a, b) => truckOrder(a.truck, b.truck));
  const i = sorted.findIndex((r) => r.fto);
  return i > 0 ? [...sorted.slice(i), ...sorted.slice(0, i)] : sorted;
}

/**
 * Which block hosts a truck lent to another plant for the day. The imported
 * location gives the plant ("Camellia"); a plant can run several blocks
 * ("Camellia Metro", "Camellia Project"), so prefer the one whose suffix
 * matches the truck's home block — a Metro truck visits the Metro block.
 * Null when no block of that plant exists (the truck stays listed at home,
 * tagged "@ plant").
 */
export function hostBlockFor(homeBlock: string, awayPlant: string, blocks: string[]): string | null {
  const plant = awayPlant.trim();
  if (!plant) return null;
  const candidates = blocks.filter((b) => samePlantWord(b.trim().split(/\s+/)[0] ?? "", plant));
  if (candidates.length === 0) return null;
  const suffix = (b: string) => b.trim().split(/\s+/).slice(1).join(" ").toLowerCase();
  return candidates.find((b) => suffix(b) === suffix(homeBlock)) ?? candidates[0];
}

/**
 * Same plant, allowing the sheet's clipped spellings — "preston" is
 * Prestons, "GIRRAWEEN CONCRETE" is Girraween. Prefix match, 4+ letters so
 * short words can't false-hit.
 */
export function samePlantWord(a: string, b: string): boolean {
  const x = a.toLowerCase();
  const y = b.toLowerCase();
  if (x === y) return true;
  return x.length >= 4 && y.length >= 4 && (x.startsWith(y) || y.startsWith(x));
}

/**
 * "Working away" label: the imported work location vs the truck's home
 * depot, compared on their first words ("CAMELLIA CONCRETE" vs "Camellia").
 * Returns the tidied plant name when the truck is lent out, null when home.
 */
export function awayPlant(workLocation: string | null | undefined, homeDepot: string): string | null {
  if (!workLocation) return null;
  const plant = workLocation.trim().split(/\s+/)[0] ?? "";
  if (!plant || samePlantWord(plant, homeDepot.trim().split(/\s+/)[0] ?? "")) return null;
  return plant.charAt(0).toUpperCase() + plant.slice(1).toLowerCase();
}

export interface FleetAvail {
  on: number;
  off: number;
  needsCover: number;
  total: number;
  pct: number;
}

/** Availability maths for a set of board rows (a day, a region, a block). */
export function availFor(rows: { status: string; driverId: number | null }[]): FleetAvail {
  let on = 0;
  let needsCover = 0;
  for (const r of rows) {
    if (isOnRoad(r.status)) on++;
    if (r.driverId == null && (isOnRoad(r.status) || r.status.toUpperCase() === "OFF-ND")) needsCover++;
  }
  const total = rows.length;
  return { on, off: total - on, needsCover, total, pct: total ? on / total : 0 };
}
