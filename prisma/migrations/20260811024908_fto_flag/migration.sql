-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_TruckAssignment" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "date" DATETIME NOT NULL,
    "truckId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ON',
    "driverId" INTEGER,
    "time" TEXT,
    "statusTime" TEXT,
    "fto" BOOLEAN NOT NULL DEFAULT false,
    "workLocation" TEXT,
    "note" TEXT,
    "createdByUserId" INTEGER,
    "updatedByUserId" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "TruckAssignment_truckId_fkey" FOREIGN KEY ("truckId") REFERENCES "Truck" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "TruckAssignment_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "Driver" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_TruckAssignment" ("createdAt", "createdByUserId", "date", "driverId", "id", "note", "status", "statusTime", "time", "truckId", "updatedAt", "updatedByUserId", "workLocation") SELECT "createdAt", "createdByUserId", "date", "driverId", "id", "note", "status", "statusTime", "time", "truckId", "updatedAt", "updatedByUserId", "workLocation" FROM "TruckAssignment";
DROP TABLE "TruckAssignment";
ALTER TABLE "new_TruckAssignment" RENAME TO "TruckAssignment";
CREATE INDEX "TruckAssignment_date_idx" ON "TruckAssignment"("date");
CREATE UNIQUE INDEX "TruckAssignment_date_truckId_key" ON "TruckAssignment"("date", "truckId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
