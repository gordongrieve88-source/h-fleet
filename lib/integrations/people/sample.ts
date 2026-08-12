import { prisma } from "@/lib/db/client";
import type { ExternalPerson, ExternalBalance, PeopleProvider } from "../types";

/**
 * DEMONSTRATION provider. Invents a plausible HR feed from the fleet already
 * in the database so the whole sync flow can be shown end to end without
 * vendor access. Everything it produces is flagged isSample and recorded as
 * such forever — see lib/integrations/types.ts.
 *
 * Deterministic: same database, same feed, so a demo repeats identically.
 */
export const samplePeopleProvider: PeopleProvider = {
  kind: "people",
  id: "sample",
  label: "Sample HR feed (demonstration data)",
  isSample: true,
  unconfiguredReason: () => null,

  async fetchPeople(): Promise<ExternalPerson[]> {
    const drivers = await prisma.driver.findMany({
      include: { depot: true },
      orderBy: { id: "asc" },
    });

    return drivers.map((d, i) => {
      // A handful of deterministic "changes" so a demo has something to show:
      // every 47th driver gets a corrected workgroup, every 61st has left.
      const workgroup = i % 47 === 13 ? "Metro" : d.workgroup;
      const isActive = d.isActive && i % 61 !== 29;
      return {
        employeeNo: d.employeeNo,
        name: d.name,
        depotName: d.depot.name,
        workgroup,
        isActive,
      };
    });
  },

  async fetchBalances(year: number): Promise<ExternalBalance[]> {
    const drivers = await prisma.driver.findMany({
      where: { isActive: true },
      select: { employeeNo: true, id: true },
      orderBy: { id: "asc" },
    });
    // Standard 20-day AL entitlement with a deterministic carry-over spread.
    return drivers.map((d, i) => ({
      employeeNo: d.employeeNo,
      leaveTypeCode: "AL",
      year,
      entitledDays: 20,
      openingBalance: Number((((i * 7) % 55) / 10).toFixed(1)),
    }));
  },
};
