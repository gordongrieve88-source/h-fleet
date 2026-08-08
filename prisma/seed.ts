/**
 * H-Fleet demo seed.
 *
 * Master data (regions, depots, drivers, trucks) loads from the cleaned
 * extract of the June 2026 "HMA Metro Roster" workbook in ./seed-data.
 * Leave + a window of board history are generated so every screen looks
 * alive. Re-running is safe — reference data upserts; fleet transactional
 * data is rebuilt.
 *
 * Runs outside Next.js (via `tsx`), so it builds its own Prisma client.
 */
import "dotenv/config";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaClient } from "../generated/prisma/client";
import {
  REGIONS as FLEET_REGIONS,
  DRIVERS as FLEET_DRIVERS,
  TRUCKS as FLEET_TRUCKS,
  LEAVE as FLEET_LEAVE,
  SEED_DAY as FLEET_SEED_DAY,
} from "./seed-data/fleet-data";

const adapter = new PrismaBetterSqlite3({
  url: process.env.DATABASE_URL ?? "file:./prisma/dev.db",
});
const prisma = new PrismaClient({ adapter });

function addDays(d: Date, n: number): Date {
  const c = new Date(d);
  c.setUTCDate(c.getUTCDate() + n);
  return c;
}

async function main() {
  // "Today" = the team's calendar day (AEST), same anchor the app uses.
  const todayKey = new Date().toLocaleDateString("en-CA", { timeZone: "Australia/Sydney" });
  const today = new Date(`${todayKey}T00:00:00.000Z`);

  // ---- Leave types ------------------------------------------------------------
  const leaveTypes = [
    { code: "AL", name: "Annual Leave", colorHex: "#7c3aed", sortOrder: 1 },
    { code: "PL", name: "Sick / Personal Leave", colorHex: "#db2777", sortOrder: 2 },
    { code: "PLC", name: "Carer's Leave", colorHex: "#0891b2", sortOrder: 3 },
    { code: "TOIL", name: "Time in Lieu", colorHex: "#2563eb", sortOrder: 4 },
    { code: "BS", name: "Bereavement", colorHex: "#475569", sortOrder: 5 },
    { code: "LWOP", name: "Leave Without Pay", colorHex: "#b45309", sortOrder: 6 },
    { code: "PH", name: "Public Holiday", colorHex: "#16a34a", sortOrder: 7 },
    { code: "LS", name: "Long Service", colorHex: "#9333ea", sortOrder: 8 },
    { code: "RTO", name: "Requested Time Off", colorHex: "#0d9488", sortOrder: 9 },
    { code: "OS", name: "Other", colorHex: "#64748b", sortOrder: 10 },
    // The metro roster spreadsheet's categories.
    { code: "RDO", name: "Rostered Day Off", colorHex: "#2563eb", sortOrder: 13 },
    { code: "PAR", name: "Parental Leave", colorHex: "#9333ea", sortOrder: 14 },
    { code: "COMP", name: "Compassionate Leave", colorHex: "#e11d48", sortOrder: 15 },
    { code: "JURY", name: "Jury Duty", colorHex: "#4f46e5", sortOrder: 16 },
  ];
  for (const lt of leaveTypes) {
    await prisma.leaveType.upsert({ where: { code: lt.code }, create: lt, update: lt });
  }

  // ---- Public holidays — AU, all states, 2026 + early 2027 ---------------------
  // Demo-grade dates; editable in Setup. Re-verify late-gazetted ones (VIC AFL
  // GF Friday, WA King's Birthday) before production.
  const HOLIDAYS: [string, string, string][] = [
    ["2026-01-01", "New Year's Day", "ALL"],
    ["2026-01-26", "Australia Day", "ALL"],
    ["2026-02-09", "Royal Hobart Regatta (southern TAS)", "TAS"],
    ["2026-03-02", "Labour Day", "WA"],
    ["2026-03-09", "Labour Day", "VIC"],
    ["2026-03-09", "Eight Hours Day", "TAS"],
    ["2026-03-09", "Adelaide Cup Day", "SA"],
    ["2026-03-09", "Canberra Day", "ACT"],
    ["2026-04-03", "Good Friday", "ALL"],
    ["2026-04-04", "Easter Saturday", "NSW,VIC,QLD,SA,ACT,NT"],
    ["2026-04-05", "Easter Sunday", "NSW,VIC,QLD,ACT"],
    ["2026-04-06", "Easter Monday", "ALL"],
    ["2026-04-25", "Anzac Day", "ALL"],
    ["2026-04-27", "Anzac Day (observed)", "WA"],
    ["2026-05-04", "Labour Day", "QLD"],
    ["2026-05-04", "May Day", "NT"],
    ["2026-06-01", "Western Australia Day", "WA"],
    ["2026-06-01", "Reconciliation Day", "ACT"],
    ["2026-06-08", "King's Birthday", "NSW,VIC,SA,TAS,ACT,NT"],
    ["2026-08-03", "Bank Holiday", "NSW"],
    ["2026-08-03", "Picnic Day", "NT"],
    ["2026-08-12", "Royal Queensland Show (Brisbane)", "QLD"],
    ["2026-09-25", "Friday before AFL Grand Final (TBC)", "VIC"],
    ["2026-09-28", "King's Birthday", "WA"],
    ["2026-10-05", "Labour Day", "NSW,SA"],
    ["2026-10-05", "King's Birthday", "QLD"],
    ["2026-11-02", "Recreation Day (northern TAS)", "TAS"],
    ["2026-11-03", "Melbourne Cup Day", "VIC"],
    ["2026-12-25", "Christmas Day", "ALL"],
    ["2026-12-26", "Boxing Day", "NSW,VIC,QLD,WA,TAS,ACT,NT"],
    ["2026-12-26", "Proclamation Day", "SA"],
    ["2026-12-28", "Boxing Day (observed)", "ALL"],
    ["2027-01-01", "New Year's Day", "ALL"],
    ["2027-01-26", "Australia Day", "ALL"],
  ];
  await prisma.publicHoliday.deleteMany();
  await prisma.publicHoliday.createMany({
    data: HOLIDAYS.map(([date, name, states]) => ({ date, name, states })),
  });

  // ---- App users -----------------------------------------------------------------
  const users = [
    { displayName: "Gordon Grieve", email: "gordon.grieve@h-fleet.demo", role: "MANAGER" },
    { displayName: "Team Supervisor (demo)", email: "supervisor@h-fleet.demo", role: "SUPERVISOR" },
    { displayName: "Staff A (demo)", email: "staff.a@h-fleet.demo", role: "STAFF" },
    { displayName: "Staff B (demo)", email: "staff.b@h-fleet.demo", role: "STAFF" },
    // Signs in as a driver — shows the self-service /me view.
    { displayName: "Driver self-service (demo)", email: "driver@h-fleet.demo", role: "STAFF" },
  ];
  for (const u of users) {
    await prisma.appUser.upsert({ where: { email: u.email }, create: u, update: u });
  }

  // ==========================================================================
  //  FLEET — real metro roster data (194 drivers / 149 trucks)
  // ==========================================================================
  // The dataset is the cleaned extract of the June 2026 workbook. Master data
  // is rebuilt from it on every seed; the captured day 02-Jun-2026 plus a
  // window of recent history feed the utilisation/availability reports.
  const fleetLeaveCode = (typeName: string) =>
    typeName.toLowerCase().startsWith("annual") ? "AL" : typeName.toLowerCase().startsWith("personal") ? "PL" : "OS";

  console.log("Seeding fleet data…");
  await prisma.truckAssignment.deleteMany();
  await prisma.driverLeave.deleteMany();
  await prisma.driverEntitlement.deleteMany();
  await prisma.truck.deleteMany();
  await prisma.driver.deleteMany();
  await prisma.depot.deleteMany();
  await prisma.fleetRegion.deleteMany();

  for (let i = 0; i < FLEET_REGIONS.length; i++) {
    await prisma.fleetRegion.create({ data: { name: FLEET_REGIONS[i], sortOrder: i } });
  }

  // Depots: unify bare driver plant names with compound truck blocks via the
  // first word ("Greenacre Project" + "Greenacre Metro" → depot "Greenacre");
  // each depot's region is decided by where most of its trucks operate.
  const firstWord = (s: string) => s.trim().split(/\s+/)[0];
  const regionVotes: Record<string, Record<string, number>> = {};
  const depotNames = new Set<string>();
  for (const d of FLEET_DRIVERS) depotNames.add(firstWord(d.plant));
  for (const t of FLEET_TRUCKS) {
    const k = firstWord(t.plant);
    depotNames.add(k);
    (regionVotes[k] ??= {})[t.region] = ((regionVotes[k] ??= {})[t.region] ?? 0) + 1;
  }
  const depotList = [...depotNames]
    .map((name) => {
      const votes = regionVotes[name] ?? {};
      const region = Object.keys(votes).sort((a, b) => votes[b] - votes[a])[0] ?? FLEET_REGIONS[0];
      return { name, region };
    })
    .sort((a, b) => FLEET_REGIONS.indexOf(a.region) - FLEET_REGIONS.indexOf(b.region) || a.name.localeCompare(b.name));
  const depotIdByName: Record<string, number> = {};
  for (let i = 0; i < depotList.length; i++) {
    const row = await prisma.depot.create({
      data: { name: depotList[i].name, regionName: depotList[i].region, sortOrder: i },
    });
    depotIdByName[depotList[i].name] = row.id;
  }

  // Drivers (dataset string id "d1" → db int id).
  const driverIdByKey: Record<string, number> = {};
  for (const d of FLEET_DRIVERS) {
    const row = await prisma.driver.create({
      data: {
        employeeNo: String(d.emp),
        name: d.name,
        depotId: depotIdByName[firstWord(d.plant)],
        workgroup: d.workgroup ?? "",
      },
    });
    driverIdByKey[d.id] = row.id;
  }

  for (let i = 0; i < FLEET_TRUCKS.length; i++) {
    const t = FLEET_TRUCKS[i];
    await prisma.truck.create({
      data: {
        id: t.id,
        depotId: depotIdByName[firstWord(t.plant)],
        region: t.region,
        block: t.plant,
        defaultDriverId: t.defaultDriverId ? (driverIdByKey[t.defaultDriverId] ?? null) : null,
        sortOrder: i,
      },
    });
  }

  // Link the demo self-service account to a driver who actually drives a
  // truck, so /me has a roster to show.
  const demoDriverUser = await prisma.appUser.findUnique({ where: { email: "driver@h-fleet.demo" } });
  const aDrivingDriver = await prisma.truck.findFirst({
    where: { defaultDriverId: { not: null } },
    select: { defaultDriverId: true },
    orderBy: { sortOrder: "asc" },
  });
  if (demoDriverUser && aDrivingDriver?.defaultDriverId) {
    const linked = await prisma.driver.update({
      where: { id: aDrivingDriver.defaultDriverId },
      data: { appUserId: demoDriverUser.id },
    });
    console.log(`Self-service demo account linked to driver: ${linked.name}`);
  }

  // ---- Driver credentials -------------------------------------------------
  // Types are reference data (upserted); per-driver credentials rebuild with
  // the fleet. Expiries are deterministic off the driver id so the demo
  // always shows a few expiring/expired rows in the doctor + Compliance page.
  const T = "Tickets & medicals";
  const credentialTypes = [
    // Dated tickets — maintained with an expiry on the Compliance screen.
    { code: "HV", name: "Heavy vehicle licence (HC)", kind: "EXPIRY", category: T, severity: "BLOCK", warnDays: 60, requiredForTruckType: null, sortOrder: 1 },
    { code: "MED", name: "Commercial driver medical", kind: "EXPIRY", category: T, severity: "WARN", warnDays: 60, requiredForTruckType: null, sortOrder: 2 },
    { code: "IND", name: "General site induction", kind: "EXPIRY", category: T, severity: "WARN", warnDays: 30, requiredForTruckType: null, sortOrder: 3 },
    // Truck sign-offs — the enforceable ones.
    { code: "AGI", name: "Agitator sign-off", kind: "TICKBOX", category: "Truck types", severity: "WARN", warnDays: 0, requiredForTruckType: "Agitator", sortOrder: 10 },
    // Mix competencies.
    { code: "MXHS", name: "High-strength mixes", kind: "TICKBOX", category: "Mix training", severity: "WARN", warnDays: 0, requiredForTruckType: null, sortOrder: 20 },
    { code: "MXCOL", name: "Coloured / architectural", kind: "TICKBOX", category: "Mix training", severity: "WARN", warnDays: 0, requiredForTruckType: null, sortOrder: 21 },
    { code: "MXSHOT", name: "Shotcrete", kind: "TICKBOX", category: "Mix training", severity: "WARN", warnDays: 0, requiredForTruckType: null, sortOrder: 22 },
    // Job-site inductions — informational: the board knows which plant a
    // truck works from, not which customer site it's sent to.
    { code: "STA", name: "Site A — major project", kind: "TICKBOX", category: "Site inductions", severity: "WARN", warnDays: 0, requiredForTruckType: null, sortOrder: 30 },
    { code: "STB", name: "Site B — rail corridor", kind: "TICKBOX", category: "Site inductions", severity: "WARN", warnDays: 0, requiredForTruckType: null, sortOrder: 31 },
  ];
  for (const ct of credentialTypes) {
    await prisma.credentialType.upsert({ where: { code: ct.code }, create: ct, update: ct });
  }
  const allDrivers = await prisma.driver.findMany({ select: { id: true }, orderBy: { id: "asc" } });
  const credRows: { driverId: number; typeCode: string; reference: string; expiresOn: Date }[] = [];
  allDrivers.forEach(({ id }, i) => {
    // Licences: spread over ~3 years ahead; every ~40th driver expiring soon,
    // one in the whole fleet already expired (i === 17).
    const hvDays = i === 17 ? -12 : i % 40 === 5 ? 21 : 90 + ((i * 37) % 1000);
    credRows.push({ driverId: id, typeCode: "HV", reference: `HC-${20000 + id}`, expiresOn: addDays(today, hvDays) });
    // Medicals: every ~30th expiring inside the warn window, one expired.
    const medDays = i === 44 ? -30 : i % 30 === 11 ? 40 : 60 + ((i * 53) % 700);
    credRows.push({ driverId: id, typeCode: "MED", reference: `MED-${7000 + id}`, expiresOn: addDays(today, medDays) });
    // Inductions: most fine, a handful inside 30 days.
    const indDays = i % 25 === 7 ? 12 : 45 + ((i * 29) % 500);
    credRows.push({ driverId: id, typeCode: "IND", reference: `IND-${3000 + id}`, expiresOn: addDays(today, indDays) });
  });
  await prisma.driverCredential.createMany({ data: credRows });

  // Competencies (tick boxes — no expiry). Deterministic spread so the demo
  // shows a realistic mix of who is and isn't signed off. Nearly everyone is
  // agitator-signed-off; a few deliberately aren't, so the truck-type gate
  // has something to catch.
  const tickRows: { driverId: number; typeCode: string }[] = [];
  allDrivers.forEach(({ id }, i) => {
    if (i % 23 !== 4) tickRows.push({ driverId: id, typeCode: "AGI" });
    if (i % 3 === 0) tickRows.push({ driverId: id, typeCode: "MXHS" });
    if (i % 7 === 2) tickRows.push({ driverId: id, typeCode: "MXCOL" });
    if (i % 11 === 5) tickRows.push({ driverId: id, typeCode: "MXSHOT" });
    if (i % 5 === 1) tickRows.push({ driverId: id, typeCode: "STA" });
    if (i % 9 === 3) tickRows.push({ driverId: id, typeCode: "STB" });
  });
  await prisma.driverCredential.createMany({ data: tickRows });

  // Scope the demo supervisor to the two biggest depots so the per-depot
  // permission model is visible out of the box (deleting depots above
  // cascaded any previous scope rows).
  const demoSupervisor = await prisma.appUser.findUnique({ where: { email: "supervisor@h-fleet.demo" } });
  if (demoSupervisor) {
    const biggest = await prisma.depot.findMany({
      orderBy: { drivers: { _count: "desc" } },
      take: 2,
      select: { id: true, name: true },
    });
    for (const dep of biggest) {
      await prisma.userDepotScope.create({ data: { userId: demoSupervisor.id, depotId: dep.id } });
    }
    console.log(`Scoped ${demoSupervisor.displayName} to: ${biggest.map((d) => d.name).join(", ")}`);
  }

  // Booked leave from the workbook (all APPROVED)…
  const dateUTC = (iso: string) => new Date(`${iso}T00:00:00.000Z`);
  for (const l of FLEET_LEAVE) {
    const did = driverIdByKey[l.driverId];
    if (!did) continue;
    await prisma.driverLeave.create({
      data: {
        driverId: did,
        leaveTypeCode: fleetLeaveCode(l.type),
        startDate: dateUTC(l.start),
        endDate: dateUTC(l.end),
        status: "APPROVED",
      },
    });
  }
  // …plus a few PENDING requests (relative to today) so Approvals has content.
  const fleetPending: { key: string; code: string; from: number; to: number }[] = [
    { key: "d50", code: "AL", from: 8, to: 9 },
    { key: "d70", code: "RDO", from: 14, to: 14 },
    { key: "d120", code: "AL", from: 15, to: 16 },
  ];
  for (const r of fleetPending) {
    const did = driverIdByKey[r.key];
    if (!did) continue;
    await prisma.driverLeave.create({
      data: {
        driverId: did,
        leaveTypeCode: r.code,
        startDate: addDays(today, r.from),
        endDate: addDays(today, r.to),
        status: "PENDING",
      },
    });
  }

  // The real captured day from the workbook (02-Jun-2026), saved verbatim.
  const fleetSeedDate = dateUTC(FLEET_SEED_DAY.date);
  await prisma.truckAssignment.createMany({
    data: FLEET_SEED_DAY.assignments.map((a) => ({
      date: fleetSeedDate,
      truckId: a.truck,
      status: a.status || "ON",
      driverId: a.driverId ? (driverIdByKey[a.driverId] ?? null) : null,
      time: a.time || null,
    })),
  });

  // Recent history: the last ~3 weeks of non-Sunday days before today, with a
  // deterministic spread of breakdowns/absences so the reports look real.
  let rngState = 1234567;
  const rng = () => ((rngState = (rngState * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);
  const allFleetTrucks = await prisma.truck.findMany({ select: { id: true, defaultDriverId: true } });
  const historyDates: Date[] = [];
  for (let back = 1; back <= 26 && historyDates.length < 15; back++) {
    const d = addDays(today, -back);
    if (d.getUTCDay() === 0) continue; // no Sunday operations
    if (d.getTime() === fleetSeedDate.getTime()) continue; // already captured
    historyDates.push(d);
  }
  // Rostered start times, staggered 05:30–07:15 the way the Syncrotess sheet
  // does, so punctuality has a plan to compare telematics actuals against.
  const startTimeFor = (index: number) => {
    const minutes = 5 * 60 + 30 + ((index * 7) % 105);
    return `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;
  };
  for (const date of historyDates) {
    await prisma.truckAssignment.createMany({
      data: allFleetTrucks.map((t, i) => {
        const r = rng();
        let status = "ON";
        let driverId = t.defaultDriverId;
        if (r < 0.04) { status = "OFF-BD"; driverId = null; } // breakdown
        else if (r < 0.08) { status = "OFF-ND"; driverId = null; } // driver not in
        else if (r < 0.1) { status = "ON-FTO"; }
        return { date, truckId: t.id, status, driverId, time: status.startsWith("ON") ? startTimeFor(i) : null };
      }),
    });
  }

  // Annual-leave entitlements: 20 days per driver for the current year.
  const fleetYear = today.getUTCFullYear();
  const allFleetDrivers = await prisma.driver.findMany({ select: { id: true } });
  await prisma.driverEntitlement.createMany({
    data: allFleetDrivers.map((d) => ({ driverId: d.id, leaveTypeCode: "AL", year: fleetYear, entitledDays: 20 })),
  });

  // ---- Summary --------------------------------------------------------------------
  console.log("Seed complete:", {
    leaveTypes: await prisma.leaveType.count(),
    holidays: await prisma.publicHoliday.count(),
    users: await prisma.appUser.count(),
    fleetRegions: await prisma.fleetRegion.count(),
    depots: await prisma.depot.count(),
    drivers: await prisma.driver.count(),
    trucks: await prisma.truck.count(),
    driverLeave: await prisma.driverLeave.count(),
    truckAssignments: await prisma.truckAssignment.count(),
  });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
