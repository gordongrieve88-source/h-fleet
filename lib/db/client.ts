import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaClient } from "@/generated/prisma/client";
import { databaseUrl } from "./config";

/**
 * The single database connection point for the whole application.
 *
 * ---------------------------------------------------------------------------
 *  SEAM — DATA ACCESS
 * ---------------------------------------------------------------------------
 *  Everything talks to the database via the repositories in ./repositories,
 *  which use this client. To move from local SQLite to SQL Server (RHEL8 or
 *  Azure — connection details live in the stored config file, see
 *  lib/db/config.ts and deploy/h-fleet.env.example):
 *    1. prisma/schema.prisma   provider = "sqlite"  ->  "sqlserver"
 *    2. fill in the DB_* fields (or DATABASE_URL) in the config file
 *    3. swap the adapter below for `@prisma/adapter-mssql`
 *  No query, page, or component changes.
 * ---------------------------------------------------------------------------
 */

const url = databaseUrl();

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

function createPrismaClient(): PrismaClient {
  const adapter = new PrismaBetterSqlite3({ url });
  return new PrismaClient({ adapter });
}

export const prisma: PrismaClient = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
