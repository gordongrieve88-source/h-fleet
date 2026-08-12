-- CreateTable
CREATE TABLE "CredentialType" (
    "code" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "severity" TEXT NOT NULL DEFAULT 'WARN',
    "warnDays" INTEGER NOT NULL DEFAULT 30,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true
);

-- CreateTable
CREATE TABLE "DriverCredential" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "driverId" INTEGER NOT NULL,
    "typeCode" TEXT NOT NULL,
    "reference" TEXT,
    "expiresOn" DATETIME,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "DriverCredential_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "Driver" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "DriverCredential_typeCode_fkey" FOREIGN KEY ("typeCode") REFERENCES "CredentialType" ("code") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "DriverCredential_expiresOn_idx" ON "DriverCredential"("expiresOn");

-- CreateIndex
CREATE UNIQUE INDEX "DriverCredential_driverId_typeCode_key" ON "DriverCredential"("driverId", "typeCode");
