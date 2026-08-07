-- CreateTable
CREATE TABLE "UserDepotScope" (
    "userId" INTEGER NOT NULL,
    "depotId" INTEGER NOT NULL,

    PRIMARY KEY ("userId", "depotId"),
    CONSTRAINT "UserDepotScope_userId_fkey" FOREIGN KEY ("userId") REFERENCES "AppUser" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "UserDepotScope_depotId_fkey" FOREIGN KEY ("depotId") REFERENCES "Depot" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
