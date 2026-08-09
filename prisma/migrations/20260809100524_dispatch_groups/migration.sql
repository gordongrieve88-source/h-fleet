-- CreateTable
CREATE TABLE "DispatchGroup" (
    "code" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "state" TEXT NOT NULL DEFAULT 'NSW',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Depot" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "regionName" TEXT NOT NULL,
    "state" TEXT NOT NULL DEFAULT 'NSW',
    "dispatchGroupCode" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    CONSTRAINT "Depot_dispatchGroupCode_fkey" FOREIGN KEY ("dispatchGroupCode") REFERENCES "DispatchGroup" ("code") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Depot_regionName_fkey" FOREIGN KEY ("regionName") REFERENCES "FleetRegion" ("name") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Depot" ("id", "isActive", "name", "regionName", "sortOrder", "state") SELECT "id", "isActive", "name", "regionName", "sortOrder", "state" FROM "Depot";
DROP TABLE "Depot";
ALTER TABLE "new_Depot" RENAME TO "Depot";
CREATE UNIQUE INDEX "Depot_name_key" ON "Depot"("name");
CREATE INDEX "Depot_regionName_idx" ON "Depot"("regionName");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
