import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { isEditRole } from "@/lib/auth/roles";
import { fleetRepo } from "@/lib/db/repositories";
import { PageHeader } from "@/components/PageHeader";
import { TrucksAdmin } from "@/components/fleet/TrucksAdmin";

export const dynamic = "force-dynamic";

export default async function FleetTrucksPage() {
  const user = await getCurrentUser();
  if (!isEditRole(user?.role)) redirect("/fleet");

  const [trucks, depots, regions, drivers] = await Promise.all([
    fleetRepo.listAllTrucks(),
    fleetRepo.listDepots(),
    fleetRepo.listRegions(),
    fleetRepo.listDrivers(),
  ]);

  return (
    <div className="space-y-4">
      <PageHeader
        title="Trucks"
        description={`${trucks.filter((t) => t.isActive).length} active trucks. Each truck has a home depot, an operating region and block, and an optional default driver used to roll a fresh day forward.`}
      />
      <TrucksAdmin
        trucks={trucks.map((t) => ({
          id: t.id,
          depotId: t.depotId,
          depot: t.depot.name,
          region: t.region,
          block: t.block,
          type: t.type,
          rosterGroup: t.rosterGroup,
          defaultDriverId: t.defaultDriverId,
          defaultDriver: t.defaultDriver?.name ?? null,
          isActive: t.isActive,
        }))}
        depots={depots.map((d) => ({ id: d.id, name: d.name, region: d.regionName }))}
        regions={regions.map((r) => r.name)}
        drivers={drivers.map((d) => ({ id: d.id, name: d.name, depot: d.depot.name }))}
      />
    </div>
  );
}
