import { mkdirSync } from "node:fs";
import os from "node:os";
import path from "node:path";

/**
 * Point the app's Prisma client at a scratch SQLite file BEFORE any test
 * imports lib/db/client (whose module-level databaseUrl() call would
 * otherwise bind to prisma/dev.db). One file per worker process — parallel
 * test files never share state. Schema setup happens in test/db.ts, only
 * for the suites that actually touch the database.
 */
const dir = path.join(os.tmpdir(), "h-fleet-tests");
mkdirSync(dir, { recursive: true });
process.env.DATABASE_URL = `file:${path.join(dir, `test-${process.pid}.db`)}`;
