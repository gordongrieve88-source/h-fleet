"use server";

import { revalidatePath } from "next/cache";
import { requireEdit, requireEditForDepot } from "@/lib/auth";
import { complianceRepo, fleetRepo } from "@/lib/db/repositories";
import { logAction } from "@/lib/audit";
import { dateFromKey, fmtDate, parseYmdOrNull } from "@/lib/wfm/date";

export type ActionResult = { ok: boolean; error?: string };

function refresh() {
  revalidatePath("/fleet/compliance");
  revalidatePath("/fleet");
}

function fail(e: unknown): ActionResult {
  return { ok: false, error: String(e).replace(/^Error:\s*/, "").slice(0, 160) };
}

/** Create or renew a credential (one row per driver/type). Empty expiry = never expires. */
export async function saveCredential(input: {
  driverId: number;
  typeCode: string;
  reference: string;
  expiresOn: string; // "YYYY-MM-DD" or "" for no expiry
  notes: string;
}): Promise<ActionResult> {
  const user = await requireEdit();
  try {
    const driver = await fleetRepo.getDriver(input.driverId);
    if (!driver) return { ok: false, error: "Unknown driver." };
    await requireEditForDepot(driver.depotId, user);

    const expiry = input.expiresOn.trim() === "" ? null : parseYmdOrNull(input.expiresOn.trim());
    if (input.expiresOn.trim() !== "" && !expiry) return { ok: false, error: "Invalid expiry date." };

    const rec = await complianceRepo.upsertCredential({
      driverId: input.driverId,
      typeCode: input.typeCode,
      reference: input.reference.trim() || null,
      expiresOn: expiry === null ? null : dateFromKey(input.expiresOn.trim()),
      notes: input.notes.trim() || null,
    });
    await logAction(
      user,
      "fleet.credential.save",
      "DriverCredential",
      rec.id,
      `${rec.type.name} for ${driver.name} — ${rec.expiresOn ? `expires ${fmtDate(rec.expiresOn)}` : "no expiry"}`,
    );
    refresh();
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

export async function removeCredential(id: number): Promise<ActionResult> {
  const user = await requireEdit();
  try {
    const existing = await complianceRepo.getCredential(id);
    if (!existing) return { ok: false, error: "That credential no longer exists." };
    const driver = await fleetRepo.getDriver(existing.driverId);
    if (driver) await requireEditForDepot(driver.depotId, user);
    const rec = await complianceRepo.deleteCredential(id);
    await logAction(user, "fleet.credential.remove", "DriverCredential", id, `Removed ${rec.type.name} for ${rec.driver.name}`);
    refresh();
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}
