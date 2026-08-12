import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { isEditRole } from "@/lib/auth/roles";
import { fleetRepo, selfServiceRepo } from "@/lib/db/repositories";
import { getViewGroup } from "@/lib/fleet/view-group";
import { PageHeader } from "@/components/PageHeader";
import { DriversAdmin } from "@/components/fleet/DriversAdmin";

export const dynamic = "force-dynamic";

export default async function FleetDriversPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const user = await getCurrentUser();
  if (!isEditRole(user?.role)) redirect("/fleet");

  const { q } = await searchParams;
  const group = await getViewGroup();
  const [drivers, depots, users] = await Promise.all([
    fleetRepo.listAllDrivers(group),
    fleetRepo.listDepots(group),
    selfServiceRepo.listLinkableUsers(),
  ]);

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
          appUserId: d.appUserId,
          appUserName: users.find((u) => u.id === d.appUserId)?.displayName ?? null,
        }))}
        depots={depots.map((d) => ({ id: d.id, name: d.name, region: d.regionName }))}
        users={users.map((u) => ({
          id: u.id,
          label: `${u.displayName}${u.email ? ` · ${u.email}` : ""}`,
          takenBy: u.driver?.name ?? null,
        }))}
      />
    </div>
  );
}
