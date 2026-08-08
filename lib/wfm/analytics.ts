import { isOnRoad } from "./fleet";
import { ymd } from "./date";

/**
 * Fleet intelligence maths — pure functions over saved board rows. Every
 * figure here comes from CAPTURED days only (days someone actually edited),
 * so a metric never counts a projection as fact. Callers say how many days
 * were captured; the UI is expected to show that denominator.
 */

export interface AssignmentFact {
  date: Date;
  truckId: string;
  status: string;
  driverId: number | null;
}

// ---------------------------------------------------------------------------
//  Truck reliability — the maintenance argument
// ---------------------------------------------------------------------------

export interface TruckReliability {
  truck: string;
  days: number;
  breakdownDays: number;
  serviceDays: number;
  onDays: number;
  /** Share of captured days spent broken down (0..1). */
  breakdownRate: number;
  availability: number;
}

const BREAKDOWN = "OFF-BD";
const ATTENTION = new Set(["ON-SER", "ON-DED"]);

/** Per-truck reliability, worst (most broken down) first. */
export function truckReliability(rows: AssignmentFact[]): TruckReliability[] {
  const acc = new Map<string, { days: Set<string>; bd: number; svc: number; on: number }>();
  for (const r of rows) {
    let a = acc.get(r.truckId);
    if (!a) acc.set(r.truckId, (a = { days: new Set(), bd: 0, svc: 0, on: 0 }));
    a.days.add(ymd(r.date));
    const status = r.status.trim().toUpperCase();
    if (status === BREAKDOWN) a.bd++;
    if (ATTENTION.has(status)) a.svc++;
    if (isOnRoad(r.status)) a.on++;
  }
  return [...acc.entries()]
    .map(([truck, a]) => {
      const days = a.days.size;
      return {
        truck,
        days,
        breakdownDays: a.bd,
        serviceDays: a.svc,
        onDays: a.on,
        breakdownRate: days ? a.bd / days : 0,
        availability: days ? a.on / days : 0,
      };
    })
    .sort((x, y) => y.breakdownRate - x.breakdownRate || y.breakdownDays - x.breakdownDays || x.truck.localeCompare(y.truck));
}

// ---------------------------------------------------------------------------
//  Availability trend
// ---------------------------------------------------------------------------

export interface DayAvailability {
  dateKey: string;
  on: number;
  total: number;
  pct: number;
  needsCover: number;
}

export function availabilityByDay(rows: AssignmentFact[]): DayAvailability[] {
  const acc = new Map<string, { on: number; total: number; cover: number }>();
  for (const r of rows) {
    const key = ymd(r.date);
    const a = acc.get(key) ?? { on: 0, total: 0, cover: 0 };
    a.total++;
    if (isOnRoad(r.status)) a.on++;
    if (r.driverId == null && (isOnRoad(r.status) || r.status.trim().toUpperCase() === "OFF-ND")) a.cover++;
    acc.set(key, a);
  }
  return [...acc.entries()]
    .map(([dateKey, a]) => ({ dateKey, on: a.on, total: a.total, pct: a.total ? a.on / a.total : 0, needsCover: a.cover }))
    .sort((x, y) => x.dateKey.localeCompare(y.dateKey));
}

/** Mean of a numeric series — used for the trend headline. */
export function mean(values: number[]): number {
  return values.length ? values.reduce((a, b) => a + b, 0) / values.length : 0;
}

// ---------------------------------------------------------------------------
//  Planned vs actual — how much does the day change after it's planned?
// ---------------------------------------------------------------------------

export interface ChurnDay {
  dateKey: string;
  /** Trucks whose driver differs from the truck's default driver. */
  changed: number;
  total: number;
  pct: number;
}

export interface ChurnSummary {
  byDay: ChurnDay[];
  /** Trucks that most often carry someone other than their default driver. */
  mostChanged: { truck: string; changed: number; days: number; pct: number }[];
  overallPct: number;
}

/**
 * Compare each saved row against the plan (the truck's default driver). A
 * "change" is any captured truck-day where the driver isn't the default —
 * including being left empty. That's the daily churn dispatchers absorb.
 */
export function plannedVsActual(rows: AssignmentFact[], defaultDriverByTruck: Map<string, number | null>): ChurnSummary {
  const byDay = new Map<string, { changed: number; total: number }>();
  const byTruck = new Map<string, { changed: number; days: number }>();
  let changed = 0;
  let total = 0;

  for (const r of rows) {
    const planned = defaultDriverByTruck.get(r.truckId);
    if (planned === undefined) continue; // truck no longer in the fleet
    const isChanged = (planned ?? null) !== r.driverId;
    const key = ymd(r.date);

    const d = byDay.get(key) ?? { changed: 0, total: 0 };
    d.total++;
    if (isChanged) d.changed++;
    byDay.set(key, d);

    const t = byTruck.get(r.truckId) ?? { changed: 0, days: 0 };
    t.days++;
    if (isChanged) t.changed++;
    byTruck.set(r.truckId, t);

    total++;
    if (isChanged) changed++;
  }

  return {
    byDay: [...byDay.entries()]
      .map(([dateKey, d]) => ({ dateKey, changed: d.changed, total: d.total, pct: d.total ? d.changed / d.total : 0 }))
      .sort((a, b) => a.dateKey.localeCompare(b.dateKey)),
    mostChanged: [...byTruck.entries()]
      .map(([truck, t]) => ({ truck, changed: t.changed, days: t.days, pct: t.days ? t.changed / t.days : 0 }))
      .filter((t) => t.changed > 0)
      .sort((a, b) => b.pct - a.pct || b.changed - a.changed || a.truck.localeCompare(b.truck)),
    overallPct: total ? changed / total : 0,
  };
}
