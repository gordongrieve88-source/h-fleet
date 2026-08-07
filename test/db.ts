import Database from "better-sqlite3";
import { readdirSync, readFileSync, rmSync } from "node:fs";
import path from "node:path";
import { prisma } from "@/lib/db/client";

/**
 * Scratch-database harness for repository tests. The schema comes from the
 * real committed migrations (so tests also prove the migrations build a
 * working schema), applied with a plain better-sqlite3 connection to the
 * file test/setup.ts pointed DATABASE_URL at.
 */

function dbFile(): string {
  const url = process.env.DATABASE_URL ?? "";
  if (!url.startsWith("file:")) throw new Error(`Tests expect a file: DATABASE_URL, got "${url}"`);
  return url.slice("file:".length);
}

/** Build the schema from prisma/migrations (idempotent per test file). */
export function applyMigrations(): void {
  const file = dbFile();
  rmSync(file, { force: true });
  const migrationsDir = path.resolve(import.meta.dirname, "../prisma/migrations");
  const db = new Database(file);
  try {
    for (const entry of readdirSync(migrationsDir).sort()) {
      const sqlPath = path.join(migrationsDir, entry, "migration.sql");
      let sql: string;
      try {
        sql = readFileSync(sqlPath, "utf8");
      } catch {
        continue; // migration_lock.toml etc.
      }
      db.exec(sql);
    }
  } finally {
    db.close();
  }
}

/** Empty every table (children before parents for FK order). */
export async function wipeData(): Promise<void> {
  await prisma.truckAssignment.deleteMany();
  await prisma.driverLeave.deleteMany();
  await prisma.driverEntitlement.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.auditLog.deleteMany();
  await prisma.truck.deleteMany();
  await prisma.driver.deleteMany();
  await prisma.depot.deleteMany();
  await prisma.fleetRegion.deleteMany();
  await prisma.appUser.deleteMany();
  await prisma.leaveType.deleteMany();
  await prisma.publicHoliday.deleteMany();
}

export interface Fixture {
  driver1: number;
  driver2: number;
  driver3: number;
}

/**
 * Minimal fleet: one depot, three trucks — T1 (default driver 1),
 * T2 (default driver 2), T3 (no default driver) — and leave type AL.
 */
export async function seedFixture(): Promise<Fixture> {
  await prisma.leaveType.create({ data: { code: "AL", name: "Annual leave" } });
  await prisma.fleetRegion.create({ data: { name: "Metro Test" } });
  const depot = await prisma.depot.create({ data: { name: "Testville", regionName: "Metro Test" } });
  const [d1, d2, d3] = await Promise.all(
    ["Alpha Driver", "Bravo Driver", "Charlie Driver"].map((name, i) =>
      prisma.driver.create({ data: { name, employeeNo: `E${i + 1}`, depotId: depot.id } }),
    ),
  );
  await prisma.truck.create({
    data: { id: "T1", depotId: depot.id, region: "Metro Test", block: "Test Block", defaultDriverId: d1.id, sortOrder: 1 },
  });
  await prisma.truck.create({
    data: { id: "T2", depotId: depot.id, region: "Metro Test", block: "Test Block", defaultDriverId: d2.id, sortOrder: 2 },
  });
  await prisma.truck.create({
    data: { id: "T3", depotId: depot.id, region: "Metro Test", block: "Test Block", defaultDriverId: null, sortOrder: 3 },
  });
  return { driver1: d1.id, driver2: d2.id, driver3: d3.id };
}
