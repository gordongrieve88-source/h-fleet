-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Truck" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "depotId" INTEGER NOT NULL,
    "region" TEXT NOT NULL,
    "block" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'Agitator',
    "rosterGroup" INTEGER NOT NULL DEFAULT 2,
    "defaultDriverId" INTEGER,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Truck_depotId_fkey" FOREIGN KEY ("depotId") REFERENCES "Depot" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Truck_defaultDriverId_fkey" FOREIGN KEY ("defaultDriverId") REFERENCES "Driver" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Truck" ("block", "createdAt", "defaultDriverId", "depotId", "id", "isActive", "region", "sortOrder", "type", "updatedAt") SELECT "block", "createdAt", "defaultDriverId", "depotId", "id", "isActive", "region", "sortOrder", "type", "updatedAt" FROM "Truck";
DROP TABLE "Truck";
ALTER TABLE "new_Truck" RENAME TO "Truck";
CREATE INDEX "Truck_depotId_idx" ON "Truck"("depotId");
CREATE INDEX "Truck_region_idx" ON "Truck"("region");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
