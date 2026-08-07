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
export async function loadFleetCatalog(): Promise<FleetCatalogVM> {
  const [regions, depots, drivers, trucks] = await Promise.all([
    fleetRepo.listRegions(),
    fleetRepo.listDepots(),
    fleetRepo.listDrivers(),
    fleetRepo.listTrucks(),
  ]);

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
