-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_CredentialType" (
    "code" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "kind" TEXT NOT NULL DEFAULT 'EXPIRY',
    "category" TEXT NOT NULL DEFAULT 'Tickets & medicals',
    "severity" TEXT NOT NULL DEFAULT 'WARN',
    "warnDays" INTEGER NOT NULL DEFAULT 30,
    "requiredForTruckType" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true
);
INSERT INTO "new_CredentialType" ("code", "isActive", "name", "severity", "sortOrder", "warnDays") SELECT "code", "isActive", "name", "severity", "sortOrder", "warnDays" FROM "CredentialType";
DROP TABLE "CredentialType";
ALTER TABLE "new_CredentialType" RENAME TO "CredentialType";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
