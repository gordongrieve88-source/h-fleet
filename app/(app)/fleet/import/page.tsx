import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { isEditRole } from "@/lib/auth/roles";
import { todayKey } from "@/lib/wfm/date";
import { PageHeader } from "@/components/PageHeader";
import { AllocationImport } from "@/components/fleet/AllocationImport";

export const dynamic = "force-dynamic";

/** Upload the day's Syncrotess allocation PDF and apply it to the board. */
export default async function FleetImportPage() {
  const user = await getCurrentUser();
  if (!isEditRole(user?.role)) redirect("/fleet");

  return (
    <div className="space-y-4">
      <PageHeader
        title="Import allocations"
        description="Upload the daily Syncrotess allocation PDF. Every row is matched against the real fleet — trucks by code, drivers by employee number or name — then you review what matched before anything touches the board."
      />
      <AllocationImport defaultDate={todayKey()} />
    </div>
  );
}
