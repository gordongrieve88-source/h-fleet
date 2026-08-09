import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { isManagerRole } from "@/lib/auth/roles";
import { fleetRepo } from "@/lib/db/repositories";
import { getViewGroup } from "@/lib/fleet/view-group";
import { PageHeader } from "@/components/PageHeader";
import { DepotsAdmin } from "@/components/fleet/DepotsAdmin";

export const dynamic = "force-dynamic";

export default async function FleetDepotsPage() {
  const user = await getCurrentUser();
  if (!isManagerRole(user?.role)) redirect("/fleet");

  const group = await getViewGroup();
  const [depots, regions, groups] = await Promise.all([
    fleetRepo.listAllDepots(group),
    fleetRepo.listAllRegions(),
    fleetRepo.listAllDispatchGroups(),
  ]);

  return (
    <div className="space-y-4">
      <PageHeader
        title="Depots & regions"
        description="The structure the fleet module groups by. Add a region and depots and the board + leave planner pick them up automatically — nothing is hand-drawn."
      />
      <DepotsAdmin
        depots={depots.map((d) => ({
          id: d.id,
          name: d.name,
          region: d.regionName,
          state: d.state,
          groupCode: d.dispatchGroupCode,
          isActive: d.isActive,
          drivers: d._count.drivers,
          trucks: d._count.trucks,
        }))}
        regions={regions.map((r) => ({ name: r.name, isActive: r.isActive, depots: r._count.depots }))}
        groups={groups.filter((g) => g.isActive).map((g) => ({ code: g.code, name: g.name }))}
      />
    </div>
  );
}
