/**
 * Fleet domain constants + board maths. Truck status codes carry over from
 * the original HMA Metro Roster spreadsheet — the dispatchers already speak
 * this language, so the codes are the UI.
 */

export const TRUCK_STATUS = {
  ON: { code: "ON", label: "On road", kind: "on" },
  "ON-FTO": { code: "ON-FTO", label: "First truck out", kind: "on" },
  "ON-LS": { code: "ON-LS", label: "Late start", kind: "on" },
  "ON-EF": { code: "ON-EF", label: "Early finish", kind: "on" },
  "ON-SER": { code: "ON-SER", label: "On — needs service", kind: "warn" },
  "ON-DED": { code: "ON-DED", label: "On — needs dedag", kind: "warn" },
  OFF: { code: "OFF", label: "Off", kind: "off" },
  "OFF-BD": { code: "OFF-BD", label: "Breakdown", kind: "off" },
  "OFF-ND": { code: "OFF-ND", label: "Driver not in / leave", kind: "off" },
  "OFF-NR": { code: "OFF-NR", label: "Not required", kind: "off" },
  "OFF-PAR": { code: "OFF-PAR", label: "Parked up", kind: "off" },
} as const;

export type TruckStatusCode = keyof typeof TRUCK_STATUS;
export const TRUCK_STATUS_CODES = Object.keys(TRUCK_STATUS) as TruckStatusCode[];

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
