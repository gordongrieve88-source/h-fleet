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

/**
 * "Working away" label: the imported work location vs the truck's home
 * depot, compared on their first words ("CAMELLIA CONCRETE" vs "Camellia").
 * Returns the tidied plant name when the truck is lent out, null when home.
 */
export function awayPlant(workLocation: string | null | undefined, homeDepot: string): string | null {
  if (!workLocation) return null;
  const plant = workLocation.trim().split(/\s+/)[0] ?? "";
  if (!plant || plant.toLowerCase() === (homeDepot.trim().split(/\s+/)[0] ?? "").toLowerCase()) return null;
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
