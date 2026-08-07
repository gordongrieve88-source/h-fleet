import { todayKey, ymd } from "./date";

/**
 * Leave-planner date maths, on YYYY-MM-DD keys. The fleet works Mon–Sat:
 * Sundays never count as leave days; Saturdays only when the booking says so.
 */

const pad = (n: number) => String(n).padStart(2, "0");

export interface MonthDay {
  iso: string;
  num: number;
  dow: number; // 0 Sun .. 6 Sat
  isWeekend: boolean;
  isToday: boolean;
}

/** Every day of a "YYYY-MM" month, flagged for the planner grid. */
export function daysInMonth(ym: string): MonthDay[] {
  const [y, m] = ym.split("-").map(Number);
  const dim = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const todayIso = todayKey();
  return Array.from({ length: dim }, (_, i) => {
    const iso = `${ym}-${pad(i + 1)}`;
    const dow = new Date(Date.UTC(y, m - 1, i + 1)).getUTCDay();
    return { iso, num: i + 1, dow, isWeekend: dow === 0 || dow === 6, isToday: iso === todayIso };
  });
}

/** Split [from,to] into contiguous working-day runs (Sun excluded; Sat unless included). */
export function splitRange(from: string, to: string, includeSat: boolean): { start: string; end: string }[] {
  const a = new Date(`${from}T00:00:00Z`).getTime();
  const b = new Date(`${to || from}T00:00:00Z`).getTime();
  if (Number.isNaN(a) || Number.isNaN(b)) return [];
  const lo = Math.min(a, b);
  const hi = Math.max(a, b);
  const out: { start: string; end: string }[] = [];
  let runStart: string | null = null;
  let prev: string | null = null;
  for (let t = lo; t <= hi; t += 86_400_000) {
    const d = new Date(t);
    const dow = d.getUTCDay();
    const iso = ymd(d);
    const include = dow !== 0 && (includeSat || dow !== 6);
    if (include) {
      if (runStart === null) runStart = iso;
      prev = iso;
    } else if (runStart !== null) {
      out.push({ start: runStart, end: prev! });
      runStart = null;
    }
  }
  if (runStart !== null) out.push({ start: runStart, end: prev! });
  return out;
}

/** Countable leave days in [from,to] — the sum of the working-day runs. */
export function countDays(from: string, to: string, includeSat: boolean): number {
  return splitRange(from, to, includeSat).reduce((acc, seg) => {
    const a = new Date(`${seg.start}T00:00:00Z`).getTime();
    const b = new Date(`${seg.end}T00:00:00Z`).getTime();
    return acc + Math.round((b - a) / 86_400_000) + 1;
  }, 0);
}

/** Shift a "YYYY-MM" month by delta months. */
export function shiftMonth(ym: string, delta: number): string {
  const [y, m] = ym.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1 + delta, 1));
  return `${dt.getUTCFullYear()}-${pad(dt.getUTCMonth() + 1)}`;
}
