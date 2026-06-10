import "dotenv/config";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaClient } from "@/generated/prisma/client";

/**
 * The single database connection point for the whole application.
 *
 * ---------------------------------------------------------------------------
 *  SEAM — DATA ACCESS
 * ---------------------------------------------------------------------------
 *  Everything talks to the database via the repositories in ./repositories,
 *  which use this client. To move from local SQLite to Azure SQL:
 *    1. prisma/schema.prisma   provider = "sqlite"  ->  "sqlserver"
 *    2. DATABASE_URL           the Azure SQL connection string
 *    3. swap the adapter below for `@prisma/adapter-mssql`
 *  No query, page, or component changes.
 * ---------------------------------------------------------------------------
 */

const url = process.env.DATABASE_URL ?? "file:./prisma/dev.db";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

function createPrismaClient(): PrismaClient {
  const adapter = new PrismaBetterSqlite3({ url });
  return new PrismaClient({ adapter });
}

export const prisma: PrismaClient = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
