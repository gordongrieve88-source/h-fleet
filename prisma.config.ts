import { defineConfig } from "prisma/config";
import { databaseUrl } from "./lib/db/config";

/**
 * Prisma configuration. The connection lives HERE (not in schema.prisma) and
 * resolves via lib/db/config.ts — local SQLite by default, SQL Server when
 * the stored config file (deploy/h-fleet.env.example) fills in the DB_*
 * fields. Production also flips schema.prisma's provider to "sqlserver".
 */
export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    url: databaseUrl(),
  },
});
