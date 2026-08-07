/**
 * Date helpers used across the app. All storage/comparison happens at UTC
 * midnight with YYYY-MM-DD keys; "today" is anchored to the TEAM's calendar
 * day (Sydney), not UTC's — so mornings never show yesterday as today.
 * The display layer always formats with `timeZone: "UTC"`.
 */

/** The team's operating timezone — "today" means today HERE. */
export const APP_TIMEZONE = "Australia/Sydney";

/** Format a Date as a YYYY-MM-DD key (UTC). */
export function ymd(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/** Strip time-of-day, returning UTC midnight of that calendar day. */
export function atMidnightUTC(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

/** Parse "YYYY-MM-DD" into a UTC-midnight Date. */
export function dateFromKey(key: string): Date {
  return new Date(`${key}T00:00:00.000Z`);
}

/** "Today" in the team's timezone as a YYYY-MM-DD key. */
export function todayKey(): string {
  // en-CA formats as YYYY-MM-DD, exactly our date-key shape.
  return new Date().toLocaleDateString("en-CA", { timeZone: APP_TIMEZONE });
}

/** UTC midnight for "today" in the team's timezone — the past/future anchor. */
export function todayUTC(): Date {
  return dateFromKey(todayKey());
}

/** Add n calendar days to a YYYY-MM-DD key. */
export function addDaysKey(key: string, n: number): string {
  return ymd(addDaysUTC(dateFromKey(key), n));
}

/** Saturday/Sunday check for a YYYY-MM-DD key. */
export function isWeekendKey(key: string): boolean {
  const dow = dateFromKey(key).getUTCDay();
  return dow === 0 || dow === 6;
}

/** Add n calendar days (UTC). Returns a new Date. */
export function addDaysUTC(d: Date, n: number): Date {
  const c = new Date(d);
  c.setUTCDate(c.getUTCDate() + n);
  return c;
}

/** Monday of the ISO week containing d (UTC midnight). */
export function mondayOf(d: Date): Date {
  const m = atMidnightUTC(d);
  const dow = m.getUTCDay(); // 0 Sun..6 Sat
  return addDaysUTC(m, dow === 0 ? -6 : 1 - dow);
}

/** Tolerant key parser for URL params — null on missing/malformed. */
export function parseYmdOrNull(s: string | undefined | null): Date | null {
  if (!s || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return null;
  const d = dateFromKey(s);
  // Round-trip guard: JS parsing rolls impossible days over ("2026-02-30"
  // becomes 2 March) — only a key that survives unchanged is a real date.
  return Number.isNaN(d.getTime()) || ymd(d) !== s ? null : d;
}

/** "9 Jun 2026" */
export function fmtDate(d: Date): string {
  return d.toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
}

/** "Wed 10 Jun" */
export function fmtDayShort(d: Date): string {
  return d.toLocaleDateString("en-AU", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" });
}

/** "9 Jun – 14 Jun 2026" for a date range. */
export function fmtRange(a: Date, b: Date): string {
  if (a.getTime() === b.getTime()) return fmtDate(a);
  const fa = a.toLocaleDateString("en-AU", { day: "numeric", month: "short", timeZone: "UTC" });
  return `${fa} – ${fmtDate(b)}`;
}
