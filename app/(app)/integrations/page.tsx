import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { isManagerRole } from "@/lib/auth/roles";
import { integrationRepo } from "@/lib/db/repositories";
import { connectorStatuses } from "@/lib/integrations/registry";
import { addDaysKey, todayKey } from "@/lib/wfm/date";
import { PageHeader } from "@/components/PageHeader";
import { IntegrationsBoard } from "@/components/fleet/IntegrationsBoard";

export const dynamic = "force-dynamic";

/**
 * Integrations — the inbound feeds from other corporate systems. Each
 * connector is a provider behind one interface, chosen by configuration,
 * so moving from a demonstration feed to the real vendor is a config change
 * rather than a rebuild.
 */
export default async function IntegrationsPage() {
  const user = await getCurrentUser();
  if (!isManagerRole(user?.role)) redirect("/fleet");

  const [statuses, runs] = await Promise.all([connectorStatuses(), integrationRepo.recentRuns(15)]);

  return (
    <div className="space-y-4">
      <PageHeader
        title="Integrations"
        description="Inbound feeds from the systems that own the data — HR for people and entitlements, telematics for what the trucks actually did. Read-only: H-Fleet never writes back to them."
      />
      <IntegrationsBoard
        connectors={statuses}
        // Telematics reports after the fact, so yesterday is the useful default.
        defaultDate={addDaysKey(todayKey(), -1)}
        runs={runs.map((r) => ({
          id: r.id,
          connector: r.connector,
          provider: r.provider,
          isSample: r.isSample,
          dryRun: r.dryRun,
          status: r.status,
          summary: r.summary,
          at: r.startedAt.toISOString(),
        }))}
      />
    </div>
  );
}
