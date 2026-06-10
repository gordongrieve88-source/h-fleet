import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { isEditRole } from "@/lib/auth/roles";
import { fleetRepo } from "@/lib/db/repositories";
import { PageHeader } from "@/components/PageHeader";
import { DepotsAdmin } from "@/components/fleet/DepotsAdmin";

export const dynamic = "force-dynamic";

export default async function FleetDepotsPage() {
  const user = await getCurrentUser();
  if (!isEditRole(user?.role)) redirect("/fleet");

  const [depots, regions] = await Promise.all([fleetRepo.listAllDepots(), fleetRepo.listAllRegions()]);

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
          isActive: d.isActive,
          drivers: d._count.drivers,
          trucks: d._count.trucks,
        }))}
        regions={regions.map((r) => ({ name: r.name, isActive: r.isActive, depots: r._count.depots }))}
      />
    </div>
  );
}
