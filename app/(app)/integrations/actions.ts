"use server";

import { revalidatePath } from "next/cache";
import { requireManager } from "@/lib/auth";
import { integrationRepo, fleetRepo } from "@/lib/db/repositories";
import { logAction } from "@/lib/audit";
import { peopleProvider, telematicsProvider } from "@/lib/integrations/registry";
import { diffPeople, diffBalances, matchDepot, type PeopleDiff } from "@/lib/integrations/diff";
import { dateFromKey, fmtDate, parseYmdOrNull, todayUTC, ymd } from "@/lib/wfm/date";

/**
 * Running a connector is a two-step, manager-only operation: preview the
 * diff, then apply it. Sample providers are allowed, but every run records
 * `isSample` permanently so a demo can't later be mistaken for real data.
 */

export interface PeoplePreview {
  ok: true;
  isSample: boolean;
  providerLabel: string;
  fetched: number;
  create: { employeeNo: string; name: string; depot: string; resolvable: boolean }[];
  update: { name: string; employeeNo: string; changes: string[] }[];
  deactivate: { employeeNo: string; name: string }[];
  unmatchedCount: number;
  unchanged: number;
  balances: { toUpsert: number; unchanged: number; unknownEmployees: number };
}
export type ActionFail = { ok: false; error: string };

function fail(e: unknown): ActionFail {
  return { ok: false, error: String(e).replace(/^Error:\s*/, "").slice(0, 300) };
}

async function buildPeopleDiff() {
  const provider = peopleProvider();
  if (!provider) throw new Error("The people connector is switched off (PEOPLE_PROVIDER).");
  const blocked = provider.unconfiguredReason();
  if (blocked) throw new Error(blocked);

  const year = todayUTC().getUTCFullYear();
  const [feed, feedBalances, current, depots] = await Promise.all([
    provider.fetchPeople(),
    provider.fetchBalances(year),
    integrationRepo.currentDrivers(),
    fleetRepo.listDepots(),
  ]);

  const currentVM = current.map((d) => ({
    id: d.id,
    employeeNo: d.employeeNo,
    name: d.name,
    depotId: d.depotId,
    depotName: d.depot.name,
    workgroup: d.workgroup,
    isActive: d.isActive,
  }));
  const depotVM = depots.map((d) => ({ id: d.id, name: d.name }));
  const diff = diffPeople(feed, currentVM, depotVM);
  const balances = diffBalances(feedBalances, currentVM, await integrationRepo.entitlements(year));
  return { provider, feed, diff, balances, depotVM };
}

function summarisePeople(
  diff: PeopleDiff,
  balances: { toUpsert: unknown[]; unchanged: number; unknownEmployees: string[] },
  fetched: number,
  provider: { label: string; isSample: boolean },
): PeoplePreview {
  return {
    ok: true,
    isSample: provider.isSample,
    providerLabel: provider.label,
    fetched,
    create: diff.toCreate.map((c) => ({
      employeeNo: c.employeeNo,
      name: c.name,
      depot: c.depotName,
      resolvable: c.depotId !== null,
    })),
    update: diff.toUpdate.map((u) => ({
      name: u.name,
      employeeNo: u.employeeNo,
      changes: u.changes.map((c) => `${c.field}: ${c.from || "—"} → ${c.to}`),
    })),
    deactivate: diff.toDeactivate.map((d) => ({ employeeNo: d.employeeNo, name: d.name })),
    unmatchedCount: diff.unmatched.length,
    unchanged: diff.unchanged,
    balances: {
      toUpsert: balances.toUpsert.length,
      unchanged: balances.unchanged,
      unknownEmployees: balances.unknownEmployees.length,
    },
  };
}

export async function previewPeopleSync(): Promise<PeoplePreview | ActionFail> {
  const user = await requireManager();
  try {
    const { provider, feed, diff, balances } = await buildPeopleDiff();
    const preview = summarisePeople(diff, balances, feed.length, provider);
    await integrationRepo.recordRun({
      connector: "people",
      provider: provider.id,
      isSample: provider.isSample,
      dryRun: true,
      status: "PREVIEW",
      summary: `Previewed ${feed.length} people — ${preview.create.length} new, ${preview.update.length} changed, ${preview.deactivate.length} leaving`,
      detail: preview,
      triggeredByUserId: user.id,
    });
    revalidatePath("/integrations");
    return preview;
  } catch (e) {
    return fail(e);
  }
}

export async function applyPeopleSync(): Promise<(PeoplePreview & { applied: true }) | ActionFail> {
  const user = await requireManager();
  try {
    const { provider, feed, diff, balances, depotVM } = await buildPeopleDiff();

    const creates = diff.toCreate
      .filter((c) => c.depotId !== null)
      .map((c) => ({ employeeNo: c.employeeNo, name: c.name, depotId: c.depotId as number, workgroup: c.workgroup }));

    const updates = diff.toUpdate.map((u) => {
      const data: { name?: string; depotId?: number; workgroup?: string; isActive?: boolean } = {};
      for (const c of u.changes) {
        if (c.field === "name") data.name = c.to;
        if (c.field === "workgroup") data.workgroup = c.to;
        if (c.field === "status") data.isActive = c.to === "active";
        if (c.field === "depot") {
          const id = matchDepot(c.to, depotVM);
          if (id !== null) data.depotId = id;
        }
      }
      return { driverId: u.driverId, data };
    });

    await integrationRepo.applyPeople({
      creates,
      updates,
      deactivates: diff.toDeactivate.map((d) => d.driverId),
    });
    await integrationRepo.applyBalances(
      balances.toUpsert.map((b) => ({
        driverId: b.driverId,
        leaveTypeCode: b.leaveTypeCode,
        year: b.year,
        entitledDays: b.entitledDays,
        openingBalance: b.openingBalance,
      })),
    );

    const preview = summarisePeople(diff, balances, feed.length, provider);
    const summary = `${provider.isSample ? "[SAMPLE DATA] " : ""}Synced people from ${provider.label} — ${creates.length} added, ${updates.length} updated, ${diff.toDeactivate.length} deactivated, ${balances.toUpsert.length} balances`;

    await integrationRepo.recordRun({
      connector: "people",
      provider: provider.id,
      isSample: provider.isSample,
      dryRun: false,
      status: "OK",
      summary,
      detail: preview,
      triggeredByUserId: user.id,
    });
    await logAction(user, "integration.people.sync", "Driver", null, summary);

    revalidatePath("/integrations");
    revalidatePath("/fleet/drivers");
    revalidatePath("/fleet");
    return { ...preview, applied: true };
  } catch (e) {
    return fail(e);
  }
}

export interface TelematicsResult {
  ok: true;
  isSample: boolean;
  providerLabel: string;
  dateKey: string;
  fetched: number;
  stored: number;
}

export async function syncTelematics(dateKey: string): Promise<TelematicsResult | ActionFail> {
  const user = await requireManager();
  try {
    const provider = telematicsProvider();
    if (!provider) throw new Error("The telematics connector is switched off (TELEMATICS_PROVIDER).");
    const blocked = provider.unconfiguredReason();
    if (blocked) throw new Error(blocked);
    if (!parseYmdOrNull(dateKey)) throw new Error("Invalid date.");

    const date = dateFromKey(dateKey);
    const rows = await provider.fetchDay(date);
    const stored = await integrationRepo.applyTelemetry(date, rows, provider.id, provider.isSample);

    const summary = `${provider.isSample ? "[SAMPLE DATA] " : ""}Telematics for ${fmtDate(date)} from ${provider.label} — ${stored} of ${rows.length} vehicles matched the fleet`;
    await integrationRepo.recordRun({
      connector: "telematics",
      provider: provider.id,
      isSample: provider.isSample,
      dryRun: false,
      status: "OK",
      summary,
      detail: { dateKey: ymd(date), fetched: rows.length, stored },
      triggeredByUserId: user.id,
    });
    await logAction(user, "integration.telematics.sync", "TruckTelemetry", null, summary);

    revalidatePath("/integrations");
    revalidatePath("/fleet");
    revalidatePath("/fleet/intelligence");
    return { ok: true, isSample: provider.isSample, providerLabel: provider.label, dateKey: ymd(date), fetched: rows.length, stored };
  } catch (e) {
    return fail(e);
  }
}
