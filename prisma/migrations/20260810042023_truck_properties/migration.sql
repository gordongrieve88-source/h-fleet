-- CreateTable
CREATE TABLE "TruckProperty" (
    "code" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true
);

-- CreateTable
CREATE TABLE "TruckOnProperty" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "truckId" TEXT NOT NULL,
    "propertyCode" TEXT NOT NULL,
    CONSTRAINT "TruckOnProperty_truckId_fkey" FOREIGN KEY ("truckId") REFERENCES "Truck" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "TruckOnProperty_propertyCode_fkey" FOREIGN KEY ("propertyCode") REFERENCES "TruckProperty" ("code") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "TruckOnProperty_propertyCode_idx" ON "TruckOnProperty"("propertyCode");

-- CreateIndex
CREATE UNIQUE INDEX "TruckOnProperty_truckId_propertyCode_key" ON "TruckOnProperty"("truckId", "propertyCode");
