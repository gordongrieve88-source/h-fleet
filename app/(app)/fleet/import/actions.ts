"use server";

import { revalidatePath } from "next/cache";
import { requireEdit, getDepotScope } from "@/lib/auth";
import { depotInScope } from "@/lib/auth/scope";
import { fleetBoardRepo, fleetRepo } from "@/lib/db/repositories";
import { logAction } from "@/lib/audit";
import { extractPdfLines } from "@/lib/import/pdf";
import { parseAllocationLines, type EntryStatus } from "@/lib/import/syncrotess";
import { dateFromKey, fmtDate, parseYmdOrNull } from "@/lib/wfm/date";

/** One previewed allocation row, ready for the review table. */
export interface PreviewEntry {
  line: string;
  truckId: string | null;
  truckToken: string;
  driverId: number | null;
  driverName: string | null;
  time: string | null;
  status: EntryStatus;
  /** False when the truck's depot is outside the importer's scope. */
  editable: boolean;
}

export type ParseResult =
  | { ok: true; dateKey: string | null; entries: PreviewEntry[] }
  | { ok: false; error: string };

export async function parseAllocationPdf(formData: FormData): Promise<ParseResult> {
  const user = await requireEdit();
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) return { ok: false, error: "Choose the day's allocation PDF first." };
  if (file.size > 10 * 1024 * 1024) return { ok: false, error: "That file is over 10 MB — not a daily allocation sheet." };
  if (!/pdf$/i.test(file.name) && file.type !== "application/pdf") {
    return { ok: false, error: "That doesn't look like a PDF." };
  }

  try {
    const [lines, trucks, drivers, scope] = await Promise.all([
      file.arrayBuffer().then(extractPdfLines),
      fleetRepo.listTrucks(),
      fleetRepo.listDrivers(),
      getDepotScope(user),
    ]);
    const outcome = parseAllocationLines(lines, {
      truckIds: trucks.map((t) => t.id),
      drivers: drivers.map((d) => ({ id: d.id, name: d.name, empNo: d.employeeNo })),
    });
    const depotByTruck = new Map(trucks.map((t) => [t.id, t.depotId]));
    const entries: PreviewEntry[] = outcome.entries.map((e) => ({
      ...e,
      editable: e.truckId == null || depotInScope(scope, depotByTruck.get(e.truckId)!),
    }));
    if (entries.length === 0) {
      return { ok: false, error: "No allocation rows recognised — is this the Syncrotess daily sheet? If it is, send the file to the H-Fleet maintainers to teach the parser its layout." };
    }
    return { ok: true, dateKey: outcome.dateKey, entries };
  } catch (e) {
    return { ok: false, error: String(e).replace(/^Error:\s*/, "").slice(0, 200) };
  }
}

export interface CommitResult {
  ok: boolean;
  error?: string;
  applied?: number;
  timesSet?: number;
  moves?: number;
  skippedScope?: number;
}

export async function commitAllocationImport(input: {
  dateKey: string;
  applyDrivers: boolean;
  allocations: { truckId: string; driverId: number | null; time: string | null }[];
}): Promise<CommitResult> {
  const user = await requireEdit();
  if (!parseYmdOrNull(input.dateKey)) return { ok: false, error: "Invalid date." };
  if (input.allocations.length === 0) return { ok: false, error: "Nothing selected to import." };

  try {
    const date = dateFromKey(input.dateKey);
    const [trucks, scope] = await Promise.all([fleetRepo.listTrucks(), getDepotScope(user)]);
    const depotByTruck = new Map(trucks.map((t) => [t.id, t.depotId]));

    // Server-side truth: unknown trucks are dropped, out-of-scope ones skipped.
    const known = input.allocations.filter((a) => depotByTruck.has(a.truckId));
    const inScope = known.filter((a) => depotInScope(scope, depotByTruck.get(a.truckId)!));
    const skippedScope = known.length - inScope.length;
    if (inScope.length === 0) return { ok: false, error: "Every selected truck is outside your depots." };

    const { timesSet, moves } = await fleetBoardRepo.applyAllocations(date, inScope, input.applyDrivers, user.id);
    await logAction(
      user,
      "fleet.import",
      "TruckAssignment",
      null,
      `Imported Syncrotess allocations for ${fmtDate(date)} — ${inScope.length} trucks, ${timesSet} start times, ${moves} driver placements${skippedScope ? `, ${skippedScope} outside scope skipped` : ""}`,
    );
    revalidatePath("/fleet");
    revalidatePath("/fleet/week");
    revalidatePath("/");
    return { ok: true, applied: inScope.length, timesSet, moves, skippedScope };
  } catch (e) {
    return { ok: false, error: String(e).replace(/^Error:\s*/, "").slice(0, 200) };
  }
}
