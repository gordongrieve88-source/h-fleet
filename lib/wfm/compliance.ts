import { addDaysKey, ymd } from "./date";

/**
 * Rostering guardrails — credential expiry states and consecutive-days-worked
 * runs. Pure maths over prepared inputs; the data assembly lives in
 * lib/db/repositories/compliance.repo.ts.
 *
 * The fatigue flag is a ROSTERING guardrail ("this driver is on a long
 * unbroken run"), not an NHVR work/rest-hours determination — it knows
 * days, not hours. Thresholds below are deliberate defaults: flag from
 * FATIGUE_WARN_DAYS straight days, treat FATIGUE_CRITICAL_DAYS as critical
 * (working every day of a fortnight). Move to Setup if depots need to tune.
 */

export const FATIGUE_WARN_DAYS = 10;
export const FATIGUE_CRITICAL_DAYS = 13;

export type CredentialState = "ok" | "expiring" | "expired" | "none";

/** Expiry state of one credential on `today` (both UTC-midnight dates).
 *  A credential expiring ON today still covers today; expired from tomorrow. */
export function credentialState(expiresOn: Date | null, today: Date, warnDays: number): CredentialState {
  if (expiresOn === null) return "ok"; // never expires
  const days = Math.round((expiresOn.getTime() - today.getTime()) / 86_400_000);
  if (days < 0) return "expired";
  if (days < warnDays) return "expiring";
  return "ok";
}

/** Days until expiry (negative = days since it expired). */
export function daysUntil(expiresOn: Date, today: Date): number {
  return Math.round((expiresOn.getTime() - today.getTime()) / 86_400_000);
}

/**
 * Length of the unbroken run of worked days ENDING at dateKey, given the set
 * of YYYY-MM-DD keys the driver worked (including dateKey itself if rostered
 * that day). "8" means dateKey is their 8th straight day.
 */
export function runLengthEndingAt(worked: ReadonlySet<string>, dateKey: string): number {
  let run = 0;
  let cursor = dateKey;
  while (worked.has(cursor)) {
    run++;
    cursor = addDaysKey(cursor, -1);
  }
  return run;
}

/** Convenience for building worked-day sets from Date rows. */
export function toDayKeySet(dates: Iterable<Date>): Set<string> {
  const s = new Set<string>();
  for (const d of dates) s.add(ymd(d));
  return s;
}
