-- CreateTable
CREATE TABLE "LeaveType" (
    "code" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "colorHex" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true
);

-- CreateTable
CREATE TABLE "PublicHoliday" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "date" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "states" TEXT NOT NULL DEFAULT 'ALL'
);

-- CreateTable
CREATE TABLE "AppUser" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "displayName" TEXT NOT NULL,
    "email" TEXT,
    "role" TEXT NOT NULL DEFAULT 'STAFF',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "entraObjectId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" INTEGER,
    "userName" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "entity" TEXT NOT NULL,
    "entityId" INTEGER,
    "summary" TEXT NOT NULL,
    "meta" TEXT
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "userId" INTEGER NOT NULL,
    "at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "kind" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT,
    "href" TEXT,
    "readAt" DATETIME,
    CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "AppUser" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "FleetRegion" (
    "name" TEXT NOT NULL PRIMARY KEY,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true
);

-- CreateTable
CREATE TABLE "Depot" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "regionName" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    CONSTRAINT "Depot_regionName_fkey" FOREIGN KEY ("regionName") REFERENCES "FleetRegion" ("name") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Driver" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "employeeNo" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "depotId" INTEGER NOT NULL,
    "workgroup" TEXT NOT NULL DEFAULT '',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Driver_depotId_fkey" FOREIGN KEY ("depotId") REFERENCES "Depot" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Truck" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "depotId" INTEGER NOT NULL,
    "region" TEXT NOT NULL,
    "block" TEXT NOT NULL,
    "defaultDriverId" INTEGER,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Truck_depotId_fkey" FOREIGN KEY ("depotId") REFERENCES "Depot" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Truck_defaultDriverId_fkey" FOREIGN KEY ("defaultDriverId") REFERENCES "Driver" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "TruckAssignment" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "date" DATETIME NOT NULL,
    "truckId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ON',
    "driverId" INTEGER,
    "time" TEXT,
    "note" TEXT,
    "createdByUserId" INTEGER,
    "updatedByUserId" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "TruckAssignment_truckId_fkey" FOREIGN KEY ("truckId") REFERENCES "Truck" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "TruckAssignment_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "Driver" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "DriverLeave" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "driverId" INTEGER NOT NULL,
    "leaveTypeCode" TEXT NOT NULL,
    "startDate" DATETIME NOT NULL,
    "endDate" DATETIME NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'APPROVED',
    "notes" TEXT,
    "decisionNote" TEXT,
    "decidedByUserId" INTEGER,
    "decidedAt" DATETIME,
    "createdByUserId" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "DriverLeave_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "Driver" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "DriverLeave_leaveTypeCode_fkey" FOREIGN KEY ("leaveTypeCode") REFERENCES "LeaveType" ("code") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "DriverEntitlement" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "driverId" INTEGER NOT NULL,
    "leaveTypeCode" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "entitledDays" REAL NOT NULL DEFAULT 0,
    "openingBalance" REAL NOT NULL DEFAULT 0,
    CONSTRAINT "DriverEntitlement_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "Driver" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "DriverEntitlement_leaveTypeCode_fkey" FOREIGN KEY ("leaveTypeCode") REFERENCES "LeaveType" ("code") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "PublicHoliday_date_idx" ON "PublicHoliday"("date");

-- CreateIndex
CREATE UNIQUE INDEX "AppUser_email_key" ON "AppUser"("email");

-- CreateIndex
CREATE UNIQUE INDEX "AppUser_entraObjectId_key" ON "AppUser"("entraObjectId");

-- CreateIndex
CREATE INDEX "AuditLog_at_idx" ON "AuditLog"("at");

-- CreateIndex
CREATE INDEX "AuditLog_action_idx" ON "AuditLog"("action");

-- CreateIndex
CREATE INDEX "Notification_userId_readAt_idx" ON "Notification"("userId", "readAt");

-- CreateIndex
CREATE UNIQUE INDEX "Depot_name_key" ON "Depot"("name");

-- CreateIndex
CREATE INDEX "Depot_regionName_idx" ON "Depot"("regionName");

-- CreateIndex
CREATE UNIQUE INDEX "Driver_employeeNo_key" ON "Driver"("employeeNo");

-- CreateIndex
CREATE INDEX "Driver_depotId_idx" ON "Driver"("depotId");

-- CreateIndex
CREATE INDEX "Driver_isActive_idx" ON "Driver"("isActive");

-- CreateIndex
CREATE INDEX "Truck_depotId_idx" ON "Truck"("depotId");

-- CreateIndex
CREATE INDEX "Truck_region_idx" ON "Truck"("region");

-- CreateIndex
CREATE INDEX "TruckAssignment_date_idx" ON "TruckAssignment"("date");

-- CreateIndex
CREATE UNIQUE INDEX "TruckAssignment_date_truckId_key" ON "TruckAssignment"("date", "truckId");

-- CreateIndex
CREATE INDEX "DriverLeave_driverId_startDate_idx" ON "DriverLeave"("driverId", "startDate");

-- CreateIndex
CREATE INDEX "DriverLeave_status_idx" ON "DriverLeave"("status");

-- CreateIndex
CREATE UNIQUE INDEX "DriverEntitlement_driverId_leaveTypeCode_year_key" ON "DriverEntitlement"("driverId", "leaveTypeCode", "year");
