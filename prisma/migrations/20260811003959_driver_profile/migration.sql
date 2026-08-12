-- CreateTable
CREATE TABLE "DriverProfileField" (
    "code" TEXT NOT NULL PRIMARY KEY,
    "label" TEXT NOT NULL,
    "section" TEXT NOT NULL,
    "kind" TEXT NOT NULL DEFAULT 'TEXT',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true
);

-- CreateTable
CREATE TABLE "DriverProfileValue" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "driverId" INTEGER NOT NULL,
    "fieldCode" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "DriverProfileValue_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "Driver" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "DriverProfileValue_fieldCode_fkey" FOREIGN KEY ("fieldCode") REFERENCES "DriverProfileField" ("code") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "DriverProfileValue_fieldCode_idx" ON "DriverProfileValue"("fieldCode");

-- CreateIndex
CREATE UNIQUE INDEX "DriverProfileValue_driverId_fieldCode_key" ON "DriverProfileValue"("driverId", "fieldCode");
