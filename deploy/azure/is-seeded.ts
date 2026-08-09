/**
 * Prints "empty" or "seeded" — used by startup.sh to decide whether a fresh
 * App Service instance needs seeding. A separate script rather than inline
 * node because it has to resolve the same DATABASE_URL the app does.
 */
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaClient } from "../../generated/prisma/client";

async function main() {
  const prisma = new PrismaClient({
    adapter: new PrismaBetterSqlite3({ url: process.env.DATABASE_URL ?? "file:./prisma/dev.db" }),
  });
  try {
    // Depots are the spine of the fleet — no depots, nothing to show.
    const depots = await prisma.depot.count();
    console.log(depots === 0 ? "empty" : "seeded");
  } catch {
    // A table that doesn't exist yet means the database is brand new.
    console.log("empty");
  } finally {
    await prisma.$disconnect();
  }
}

main();
