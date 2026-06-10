import "dotenv/config";
import { defineConfig } from "prisma/config";

/**
 * Prisma configuration. The connection lives HERE (not in schema.prisma).
 * Demo: a local SQLite file. Azure production: change schema.prisma's
 * provider to "sqlserver" and set DATABASE_URL — nothing else changes.
 */
export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    url: process.env.DATABASE_URL ?? "file:./prisma/dev.db",
  },
});
