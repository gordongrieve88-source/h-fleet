import { fleetRepo } from "@/lib/db/repositories";

/** Serializable view-models passed from fleet server pages to client islands. */

export interface DriverVM {
  id: number;
  name: string;
  employeeNo: string;
  depot: string;
  region: string;
  workgroup: string;
}

export interface TruckVM {
  id: string;
  depot: string;
  region: string;
  block: string;
  type: string;
  defaultDriverId: number | null;
}

export interface DepotVM {
  id: number;
  name: string;
  region: string;
  trucks: number;
  drivers: number;
}

export interface FleetCatalogVM {
  regions: string[];
  depots: DepotVM[];
  drivers: DriverVM[];
  trucks: TruckVM[];
}

export interface TruckAssignmentVM {
  truck: string;
  status: string;
  driverId: number | null;
  time: string | null;
  /** Plant the truck works this day (imported); null until a sheet lands. */
  workLocation: string | null;
  /** Planned time behind a timed status (late start / early finish / service / dedag). */
  statusTime: string | null;
}

export interface DriverLeaveVM {
  id: number;
  driverId: number;
  code: string; // leave type code
  start: string; // YYYY-MM-DD
  end: string; // YYYY-MM-DD
  status: string;
}

export interface LeaveTypeVM {
  code: string;
  name: string;
  color: string;
}

/** Load the fleet master catalog (regions, depots, drivers, trucks) as plain VMs. */
export async function loadFleetCatalog(group: string | null = null): Promise<FleetCatalogVM> {
  const [allRegions, depots, drivers, trucks] = await Promise.all([
    fleetRepo.listRegions(),
    fleetRepo.listDepots(group),
    fleetRepo.listDrivers(group),
    fleetRepo.listTrucks(group),
  ]);
  // Only offer regions that still have depots in the selected group, so the
  // board's region filter never shows an empty tab.
  const live = new Set(depots.map((d) => d.regionName));
  const regions = group === null ? allRegions : allRegions.filter((r) => live.has(r.name));

  return {
    regions: regions.map((r) => r.name),
    depots: depots.map((d) => ({
      id: d.id,
      name: d.name,
      region: d.regionName,
      trucks: d._count.trucks,
      drivers: d._count.drivers,
    })),
    drivers: drivers.map((d) => ({
      id: d.id,
      name: d.name,
      employeeNo: d.employeeNo,
      depot: d.depot.name,
      region: d.depot.regionName,
      workgroup: d.workgroup,
    })),
    trucks: trucks.map((t) => ({
      id: t.id,
      depot: t.depot.name,
      region: t.region,
      block: t.block,
      type: t.type,
      defaultDriverId: t.defaultDriverId,
    })),
  };
}
