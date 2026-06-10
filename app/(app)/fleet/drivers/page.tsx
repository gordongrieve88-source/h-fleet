import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { isEditRole } from "@/lib/auth/roles";
import { fleetRepo } from "@/lib/db/repositories";
import { PageHeader } from "@/components/PageHeader";
import { DriversAdmin } from "@/components/fleet/DriversAdmin";

export const dynamic = "force-dynamic";

export default async function FleetDriversPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const user = await getCurrentUser();
  if (!isEditRole(user?.role)) redirect("/fleet");

  const { q } = await searchParams;
  const [drivers, depots] = await Promise.all([fleetRepo.listAllDrivers(), fleetRepo.listDepots()]);

  return (
    <div className="space-y-4">
      <PageHeader
        title="Drivers"
        description={`${drivers.filter((d) => d.isActive).length} active drivers across ${depots.length} depots. Add, edit, or deactivate — changes flow straight to the board and leave planner.`}
      />
      <DriversAdmin
        initialSearch={q ?? ""}
        drivers={drivers.map((d) => ({
          id: d.id,
          employeeNo: d.employeeNo,
          name: d.name,
          depotId: d.depotId,
          depot: d.depot.name,
          region: d.depot.regionName,
          workgroup: d.workgroup,
          isActive: d.isActive,
          trucks: d._count.defaultTrucks,
        }))}
        depots={depots.map((d) => ({ id: d.id, name: d.name, region: d.regionName }))}
      />
    </div>
  );
}
