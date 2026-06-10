import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { isEditRole } from "@/lib/auth/roles";
import { driverLeaveRepo, referenceRepo } from "@/lib/db/repositories";
import { loadFleetCatalog } from "@/lib/fleet/catalog";
import { todayUTC, ymd } from "@/lib/wfm/date";
import { PageHeader } from "@/components/PageHeader";
import { DriverLeavePlanner } from "@/components/fleet/DriverLeavePlanner";

export const dynamic = "force-dynamic";

export default async function DriverLeavePage({ searchParams }: { searchParams: Promise<{ m?: string }> }) {
  const user = await getCurrentUser();
  if (!isEditRole(user?.role)) redirect("/fleet");

  const { m } = await searchParams;
  const month = m && /^\d{4}-\d{2}$/.test(m) ? m : ymd(todayUTC()).slice(0, 7);
  const [y, mo] = month.split("-").map(Number);
  const monthStart = new Date(Date.UTC(y, mo - 1, 1));
  const monthEnd = new Date(Date.UTC(y, mo, 0));

  const [catalog, leave, leaveTypes, balances] = await Promise.all([
    loadFleetCatalog(),
    driverLeaveRepo.listOverlapping(monthStart, monthEnd),
    referenceRepo.listLeaveTypes(),
    driverLeaveRepo.alBalances(y),
  ]);

  return (
    <div className="space-y-4">
      <PageHeader
        title="Driver leave"
        description="Click any day to book or request leave for a driver. Approved leave drops the driver off their truck — the board flags it as needing cover. Stretched depots flag automatically."
      />
      <DriverLeavePlanner
        month={month}
        catalog={catalog}
        leave={leave.map((l) => ({
          id: l.id,
          driverId: l.driverId,
          code: l.leaveTypeCode,
          start: ymd(l.startDate),
          end: ymd(l.endDate),
          status: l.status,
        }))}
        leaveTypes={leaveTypes.map((t) => ({ code: t.code, name: t.name, color: t.colorHex ?? "#64748b" }))}
        balances={balances}
      />
    </div>
  );
}
