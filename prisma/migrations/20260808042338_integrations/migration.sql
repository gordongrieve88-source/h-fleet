-- CreateTable
CREATE TABLE "IntegrationRun" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "connector" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "isSample" BOOLEAN NOT NULL DEFAULT false,
    "startedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" DATETIME,
    "status" TEXT NOT NULL DEFAULT 'RUNNING',
    "summary" TEXT NOT NULL DEFAULT '',
    "detail" TEXT,
    "dryRun" BOOLEAN NOT NULL DEFAULT false,
    "triggeredByUserId" INTEGER
);

-- CreateTable
CREATE TABLE "TruckTelemetry" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "date" DATETIME NOT NULL,
    "truckId" TEXT NOT NULL,
    "actualStart" TEXT,
    "odometerKm" REAL,
    "engineHours" REAL,
    "faultCode" TEXT,
    "source" TEXT NOT NULL DEFAULT 'sample',
    "isSample" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "TruckTelemetry_truckId_fkey" FOREIGN KEY ("truckId") REFERENCES "Truck" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "IntegrationRun_connector_startedAt_idx" ON "IntegrationRun"("connector", "startedAt");

-- CreateIndex
CREATE INDEX "TruckTelemetry_date_idx" ON "TruckTelemetry"("date");

-- CreateIndex
CREATE UNIQUE INDEX "TruckTelemetry_date_truckId_key" ON "TruckTelemetry"("date", "truckId");
