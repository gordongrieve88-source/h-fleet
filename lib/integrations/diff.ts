import type { ExternalPerson, ExternalBalance } from "./types";

/**
 * Pure diff maths: what an inbound feed WOULD change. Kept free of Prisma so
 * the preview shown to an operator and the writes that follow are computed by
 * exactly the same code.
 */

export interface CurrentDriver {
  id: number;
  employeeNo: string;
  name: string;
  depotId: number;
  depotName: string;
  workgroup: string;
  isActive: boolean;
}

export type FieldChange = { field: string; from: string; to: string };

export interface PersonChange {
  driverId: number;
  employeeNo: string;
  name: string;
  changes: FieldChange[];
}

export interface PeopleDiff {
  /** In the feed, not in H-Fleet. */
  toCreate: (ExternalPerson & { depotId: number | null })[];
  toUpdate: PersonChange[];
  /** Active here, but the feed says they've left. */
  toDeactivate: { driverId: number; employeeNo: string; name: string }[];
  /** In H-Fleet but absent from the feed entirely — reported, never touched. */
  unmatched: { driverId: number; employeeNo: string; name: string }[];
  unchanged: number;
}

/** Depot names differ in style between systems ("GREENACRE CONCRETE" vs
 *  "Greenacre"); match on the first word, like the roster import does. */
export function matchDepot(depotName: string, depots: { id: number; name: string }[]): number | null {
  const key = (s: string) => (s.trim().split(/\s+/)[0] ?? "").toLowerCase();
  const wanted = key(depotName);
  if (!wanted) return null;
  return depots.find((d) => key(d.name) === wanted)?.id ?? null;
}

export function diffPeople(
  feed: ExternalPerson[],
  current: CurrentDriver[],
  depots: { id: number; name: string }[],
): PeopleDiff {
  const byEmpNo = new Map(current.map((d) => [d.employeeNo.trim(), d]));
  const seen = new Set<string>();

  const toCreate: PeopleDiff["toCreate"] = [];
  const toUpdate: PersonChange[] = [];
  const toDeactivate: PeopleDiff["toDeactivate"] = [];
  let unchanged = 0;

  for (const p of feed) {
    const empNo = p.employeeNo.trim();
    if (!empNo) continue;
    seen.add(empNo);
    const existing = byEmpNo.get(empNo);
    const depotId = matchDepot(p.depotName, depots);

    if (!existing) {
      if (p.isActive) toCreate.push({ ...p, depotId });
      continue;
    }

    if (existing.isActive && !p.isActive) {
      toDeactivate.push({ driverId: existing.id, employeeNo: empNo, name: existing.name });
      continue;
    }

    const changes: FieldChange[] = [];
    if (p.name.trim() && p.name.trim() !== existing.name) {
      changes.push({ field: "name", from: existing.name, to: p.name.trim() });
    }
    if (depotId !== null && depotId !== existing.depotId) {
      const to = depots.find((d) => d.id === depotId)?.name ?? String(depotId);
      changes.push({ field: "depot", from: existing.depotName, to });
    }
    if (p.workgroup.trim() !== existing.workgroup) {
      changes.push({ field: "workgroup", from: existing.workgroup, to: p.workgroup.trim() });
    }
    if (!existing.isActive && p.isActive) {
      changes.push({ field: "status", from: "inactive", to: "active" });
    }

    if (changes.length > 0) toUpdate.push({ driverId: existing.id, employeeNo: empNo, name: existing.name, changes });
    else unchanged++;
  }

  const unmatched = current
    .filter((d) => d.isActive && !seen.has(d.employeeNo.trim()))
    .map((d) => ({ driverId: d.id, employeeNo: d.employeeNo, name: d.name }));

  return { toCreate, toUpdate, toDeactivate, unmatched, unchanged };
}

export interface BalanceChange {
  driverId: number;
  employeeNo: string;
  name: string;
  leaveTypeCode: string;
  year: number;
  entitledDays: number;
  openingBalance: number;
  /** Null when the driver has no entitlement row yet. */
  fromEntitled: number | null;
}

export function diffBalances(
  feed: ExternalBalance[],
  current: CurrentDriver[],
  existing: { driverId: number; leaveTypeCode: string; year: number; entitledDays: number; openingBalance: number }[],
): { toUpsert: BalanceChange[]; unchanged: number; unknownEmployees: string[] } {
  const byEmpNo = new Map(current.map((d) => [d.employeeNo.trim(), d]));
  const key = (driverId: number, code: string, year: number) => `${driverId}|${code}|${year}`;
  const existingByKey = new Map(existing.map((e) => [key(e.driverId, e.leaveTypeCode, e.year), e]));

  const toUpsert: BalanceChange[] = [];
  const unknownEmployees: string[] = [];
  let unchanged = 0;

  for (const b of feed) {
    const driver = byEmpNo.get(b.employeeNo.trim());
    if (!driver) {
      unknownEmployees.push(b.employeeNo);
      continue;
    }
    const prior = existingByKey.get(key(driver.id, b.leaveTypeCode, b.year));
    if (prior && prior.entitledDays === b.entitledDays && prior.openingBalance === b.openingBalance) {
      unchanged++;
      continue;
    }
    toUpsert.push({
      driverId: driver.id,
      employeeNo: b.employeeNo,
      name: driver.name,
      leaveTypeCode: b.leaveTypeCode,
      year: b.year,
      entitledDays: b.entitledDays,
      openingBalance: b.openingBalance,
      fromEntitled: prior?.entitledDays ?? null,
    });
  }
  return { toUpsert, unchanged, unknownEmployees };
}
