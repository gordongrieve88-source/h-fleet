-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_CredentialType" (
    "code" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "kind" TEXT NOT NULL DEFAULT 'EXPIRY',
    "category" TEXT NOT NULL DEFAULT 'Tickets & medicals',
    "states" TEXT NOT NULL DEFAULT 'ALL',
    "severity" TEXT NOT NULL DEFAULT 'WARN',
    "warnDays" INTEGER NOT NULL DEFAULT 30,
    "requiredForTruckType" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true
);
INSERT INTO "new_CredentialType" ("category", "code", "isActive", "kind", "name", "requiredForTruckType", "severity", "sortOrder", "warnDays") SELECT "category", "code", "isActive", "kind", "name", "requiredForTruckType", "severity", "sortOrder", "warnDays" FROM "CredentialType";
DROP TABLE "CredentialType";
ALTER TABLE "new_CredentialType" RENAME TO "CredentialType";
CREATE TABLE "new_Depot" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "regionName" TEXT NOT NULL,
    "state" TEXT NOT NULL DEFAULT 'NSW',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    CONSTRAINT "Depot_regionName_fkey" FOREIGN KEY ("regionName") REFERENCES "FleetRegion" ("name") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Depot" ("id", "isActive", "name", "regionName", "sortOrder") SELECT "id", "isActive", "name", "regionName", "sortOrder" FROM "Depot";
DROP TABLE "Depot";
ALTER TABLE "new_Depot" RENAME TO "Depot";
CREATE UNIQUE INDEX "Depot_name_key" ON "Depot"("name");
CREATE INDEX "Depot_regionName_idx" ON "Depot"("regionName");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
