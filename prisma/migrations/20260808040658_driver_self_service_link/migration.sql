-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Driver" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "employeeNo" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "depotId" INTEGER NOT NULL,
    "workgroup" TEXT NOT NULL DEFAULT '',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "appUserId" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Driver_depotId_fkey" FOREIGN KEY ("depotId") REFERENCES "Depot" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Driver_appUserId_fkey" FOREIGN KEY ("appUserId") REFERENCES "AppUser" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Driver" ("createdAt", "depotId", "employeeNo", "id", "isActive", "name", "updatedAt", "workgroup") SELECT "createdAt", "depotId", "employeeNo", "id", "isActive", "name", "updatedAt", "workgroup" FROM "Driver";
DROP TABLE "Driver";
ALTER TABLE "new_Driver" RENAME TO "Driver";
CREATE UNIQUE INDEX "Driver_employeeNo_key" ON "Driver"("employeeNo");
CREATE UNIQUE INDEX "Driver_appUserId_key" ON "Driver"("appUserId");
CREATE INDEX "Driver_depotId_idx" ON "Driver"("depotId");
CREATE INDEX "Driver_isActive_idx" ON "Driver"("isActive");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
