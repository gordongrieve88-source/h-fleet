import "dotenv/config";

/**
 * Database connection settings — the single place both the app (lib/db/client)
 * and the Prisma CLI (prisma.config.ts) resolve them from.
 *
 * Production (RHEL8 + SQL Server): enter the connection details in the stored
 * config file — see deploy/h-fleet.env.example, installed by the systemd unit
 * as /etc/h-fleet/h-fleet.env. The discrete DB_* fields are the same values an
 * ODBC record holds (server, port, database, user, password, encryption);
 * Prisma speaks to SQL Server natively, so no ODBC driver/DSN is needed on
 * the box.
 *
 * Resolution order:
 *   1. DATABASE_URL          — a full connection URL, used verbatim
 *   2. DB_HOST + DB_* fields — assembled into a SQL Server URL
 *   3. neither               — the local SQLite demo file
 */
export function databaseUrl(): string {
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL;

  if (process.env.DB_HOST) {
    const host = process.env.DB_HOST;
    const port = process.env.DB_PORT ?? "1433";
    const database = process.env.DB_NAME ?? "hfleet";
    const user = process.env.DB_USER ?? "";
    const password = process.env.DB_PASSWORD ?? "";
    const encrypt = process.env.DB_ENCRYPT ?? "true";
    const trust = process.env.DB_TRUST_SERVER_CERTIFICATE ?? "false";
    // Note: a password containing ';' or '{' must use DATABASE_URL instead,
    // with the value wrapped per Prisma's sqlserver escaping rules.
    return (
      `sqlserver://${host}:${port};database=${database};user=${user};` +
      `password=${password};encrypt=${encrypt};trustServerCertificate=${trust}`
    );
  }

  return "file:./prisma/dev.db";
}

/** True when the resolved connection is SQL Server (production mode). */
export function isSqlServer(): boolean {
  return databaseUrl().startsWith("sqlserver://");
}
