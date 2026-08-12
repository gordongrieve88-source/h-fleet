import { redirect } from "next/navigation";
import { getCurrentUser, getDepotScope } from "@/lib/auth";
import { isEditRole } from "@/lib/auth/roles";
import { depotInScope } from "@/lib/auth/scope";
import { complianceRepo, fleetRepo } from "@/lib/db/repositories";
import { credentialState, daysUntil } from "@/lib/wfm/compliance";
import { getViewGroup } from "@/lib/fleet/view-group";
import { todayUTC, ymd } from "@/lib/wfm/date";
import { PageHeader } from "@/components/PageHeader";
import { ComplianceAdmin, type ComplianceRow, type CredentialTypeVM } from "@/components/fleet/ComplianceAdmin";

export const dynamic = "force-dynamic";

/**
 * Driver credentials — licences, medicals, inductions — with expiry states.
 * The board's compliance gate and Fleet-doctor flags read the same data.
 */
export default async function FleetCompliancePage() {
  const user = await getCurrentUser();
  if (!isEditRole(user?.role)) redirect("/fleet");

  const today = todayUTC();
  const [types, drivers, credentials, depotScope] = await Promise.all([
    complianceRepo.listTypes(),
    fleetRepo.listDrivers(await getViewGroup()),
    complianceRepo.listAllCredentials(),
    getDepotScope(user),
  ]);

  const typeVMs: CredentialTypeVM[] = types.map((t) => ({
    code: t.code,
    name: t.name,
    kind: t.kind as "EXPIRY" | "TICKBOX",
    severity: t.severity as "WARN" | "BLOCK",
    warnDays: t.warnDays,
    requiredForTruckType: t.requiredForTruckType,
    states: t.states,
  }));

  const byDriver = new Map<number, typeof credentials>();
  for (const c of credentials) {
    if (!byDriver.has(c.driverId)) byDriver.set(c.driverId, []);
    byDriver.get(c.driverId)!.push(c);
  }

  const rows: ComplianceRow[] = drivers.map((d) => {
    const cells: ComplianceRow["cells"] = {};
    for (const c of byDriver.get(d.id) ?? []) {
      if (!types.some((t) => t.code === c.typeCode)) continue; // hidden type
      cells[c.typeCode] = {
        id: c.id,
        state: credentialState(c.expiresOn, today, c.type.warnDays),
        expires: c.expiresOn ? ymd(c.expiresOn) : null,
        days: c.expiresOn ? daysUntil(c.expiresOn, today) : null,
        reference: c.reference,
        notes: c.notes,
      };
    }
    return {
      id: d.id,
      name: d.name,
      employeeNo: d.employeeNo,
      depot: d.depot.name,
      editable: depotInScope(depotScope, d.depotId),
      cells,
    };
  });

  return (
    <div className="space-y-4">
      <PageHeader
        title="Compliance"
        description="Licences, medicals and inductions per driver. Expired “block” credentials stop a driver being rostered; everything else flags in the Fleet doctor before it becomes a roadside problem."
      />
      <ComplianceAdmin types={typeVMs} rows={rows} />
    </div>
  );
}
