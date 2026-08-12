-- CreateTable
CREATE TABLE "AllocatorAck" (
    "changeId" TEXT NOT NULL PRIMARY KEY,
    "date" DATETIME NOT NULL,
    "truckId" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "actionedBy" TEXT NOT NULL,
    "actionedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE INDEX "AllocatorAck_date_truckId_idx" ON "AllocatorAck"("date", "truckId");
