-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_FleetRegion" (
    "name" TEXT NOT NULL PRIMARY KEY,
    "dispatchGroupCode" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    CONSTRAINT "FleetRegion_dispatchGroupCode_fkey" FOREIGN KEY ("dispatchGroupCode") REFERENCES "DispatchGroup" ("code") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_FleetRegion" ("isActive", "name", "sortOrder") SELECT "isActive", "name", "sortOrder" FROM "FleetRegion";
DROP TABLE "FleetRegion";
ALTER TABLE "new_FleetRegion" RENAME TO "FleetRegion";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
