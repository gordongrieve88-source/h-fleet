import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { isInsightsRole } from "@/lib/auth/roles";
import { fleetBoardRepo, fleetRepo } from "@/lib/db/repositories";
import { availabilityByDay, mean, plannedVsActual, truckReliability } from "@/lib/wfm/analytics";
import { addDaysUTC, fmtDate, parseYmdOrNull, todayUTC, ymd } from "@/lib/wfm/date";
import { PageHeader } from "@/components/PageHeader";
import { EmptyState } from "@/components/EmptyState";
import { Kpi } from "@/components/fleet/Kpi";
import { Sparkline } from "@/components/fleet/Sparkline";

export const dynamic = "force-dynamic";

const WINDOWS = [30, 90, 180] as const;

/**
 * Fleet intelligence — what the captured history says, as opposed to what
 * today's board says. Reliability ranking (the maintenance argument),
 * availability trend, and planned-vs-actual churn.
 */
export default async function FleetIntelligencePage({
  searchParams,
}: {
  searchParams: Promise<{ d?: string; to?: string }>;
}) {
  const user = await getCurrentUser();
  if (!isInsightsRole(user?.role)) redirect("/fleet");

  const sp = await searchParams;
  const windowDays = WINDOWS.includes(Number(sp.d) as (typeof WINDOWS)[number]) ? Number(sp.d) : 90;
  const end = parseYmdOrNull(sp.to ?? null) ?? todayUTC();
  const start = addDaysUTC(end, -(windowDays - 1));

  const [rows, trucks] = await Promise.all([fleetBoardRepo.assignmentsInRange(start, end), fleetRepo.listAllTrucks()]);

  const capturedDays = new Set(rows.map((r) => ymd(r.date))).size;
  const truckMeta = new Map(trucks.map((t) => [t.id, t]));
  const defaults = new Map(trucks.map((t) => [t.id, t.defaultDriverId]));

  const reliability = truckReliability(rows).filter((r) => r.days >= 3);
  const availability = availabilityByDay(rows);
  const churn = plannedVsActual(rows, defaults);

  const avgAvail = mean(availability.map((a) => a.pct));
  const totalBreakdownDays = reliability.reduce((a, r) => a + r.breakdownDays, 0);
  const worst = reliability.slice(0, 12);
  const churnTop = churn.mostChanged.slice(0, 12);

  return (
    <div className="space-y-4">
      <PageHeader
        title="Fleet intelligence"
        description={`What the saved history says — reliability, availability trend and how much the plan changes. Built from ${capturedDays} captured day${capturedDays === 1 ? "" : "s"} between ${fmtDate(start)} and ${fmtDate(end)}.`}
      />

      <div className="flex flex-wrap items-center gap-2">
        {WINDOWS.map((w) => (
          <Link
            key={w}
            href={`/fleet/intelligence?d=${w}`}
            className={`rounded-full border px-3.5 py-1 text-[12.5px] font-semibold ${
              w === windowDays ? "border-brand-mid bg-brand-mid text-white" : "border-slate-300 bg-white text-slate-600 hover:bg-slate-50"
            }`}
          >
            Last {w} days
          </Link>
        ))}
        <span className="ml-auto text-xs text-slate-400">Captured days only — projections are never counted.</span>
      </div>

      {capturedDays === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-white shadow-card">
          <EmptyState
            icon="📊"
            title="No captured days in this window"
            hint="Availability and reliability build up as days are edited and saved on the board."
          />
        </div>
      ) : (
        <>
          <div className="flex flex-wrap gap-2">
            <Kpi label="Avg availability" value={`${Math.round(avgAvail * 100)}%`} tone={avgAvail >= 0.9 ? "good" : avgAvail >= 0.8 ? "warn" : "bad"} big />
            <Kpi label="Captured days" value={`${capturedDays}`} tone="neutral" />
            <Kpi label="Breakdown truck-days" value={`${totalBreakdownDays}`} tone={totalBreakdownDays > 0 ? "warn" : "good"} />
            <Kpi label="Plan changed" value={`${Math.round(churn.overallPct * 100)}%`} tone={churn.overallPct > 0.25 ? "warn" : "neutral"} />
          </div>

          {/* Availability trend */}
          <section className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-card">
            <div className="mb-2 flex items-baseline justify-between">
              <h2 className="text-sm font-semibold text-brand-deep">Availability trend</h2>
              <span className="text-xs text-slate-400">
                {availability.length} days · low {Math.round(Math.min(...availability.map((a) => a.pct)) * 100)}% · high{" "}
                {Math.round(Math.max(...availability.map((a) => a.pct)) * 100)}%
              </span>
            </div>
            <Sparkline
              points={availability.map((a) => ({ label: a.dateKey, value: a.pct }))}
              format={(v) => `${Math.round(v * 100)}%`}
            />
          </section>

          {/* Reliability */}
          <section className="rounded-xl border border-slate-200 bg-white shadow-card">
            <div className="flex items-baseline justify-between border-b border-slate-100 px-4 py-2.5">
              <h2 className="text-sm font-semibold text-brand-deep">Least reliable trucks</h2>
              <span className="text-[11px] text-slate-400">Trucks with 3+ captured days, worst breakdown rate first</span>
            </div>
            {worst.length === 0 || worst[0].breakdownDays === 0 ? (
              <p className="px-4 py-4 text-sm text-slate-400">No breakdowns recorded in this window.</p>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-[11px] uppercase tracking-wide text-slate-400">
                    <th className="px-4 py-1.5 font-semibold">Truck</th>
                    <th className="px-3 py-1.5 font-semibold">Depot</th>
                    <th className="px-3 py-1.5 font-semibold">Days</th>
                    <th className="px-3 py-1.5 font-semibold">Breakdown days</th>
                    <th className="px-3 py-1.5 font-semibold">Service/dedag</th>
                    <th className="px-3 py-1.5 font-semibold">Breakdown rate</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {worst.map((r) => (
                    <tr key={r.truck}>
                      <td className="px-4 py-1.5 font-mono font-semibold text-slate-700">{r.truck}</td>
                      <td className="px-3 py-1.5 text-slate-500">{truckMeta.get(r.truck)?.depot.name ?? "—"}</td>
                      <td className="px-3 py-1.5 tabular-nums text-slate-500">{r.days}</td>
                      <td className="px-3 py-1.5 tabular-nums font-semibold text-rose-600">{r.breakdownDays}</td>
                      <td className="px-3 py-1.5 tabular-nums text-amber-600">{r.serviceDays || ""}</td>
                      <td className="px-3 py-1.5">
                        <div className="flex items-center gap-2">
                          <div className="h-1.5 w-24 overflow-hidden rounded-full bg-slate-100">
                            <div className="h-full rounded-full bg-rose-500" style={{ width: `${Math.min(100, r.breakdownRate * 100)}%` }} />
                          </div>
                          <span className="tabular-nums text-xs font-semibold text-slate-600">{Math.round(r.breakdownRate * 100)}%</span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            <p className="border-t border-slate-100 px-4 py-2 text-[11px] text-slate-400">
              Breakdown rate = share of that truck&apos;s captured days spent OFF-BD. This is the maintenance conversation, evidenced.
            </p>
          </section>

          {/* Planned vs actual */}
          <section className="rounded-xl border border-slate-200 bg-white shadow-card">
            <div className="flex items-baseline justify-between border-b border-slate-100 px-4 py-2.5">
              <h2 className="text-sm font-semibold text-brand-deep">Plan vs actual</h2>
              <span className="text-[11px] text-slate-400">
                {Math.round(churn.overallPct * 100)}% of truck-days ran with someone other than the default driver
              </span>
            </div>
            {churnTop.length === 0 ? (
              <p className="px-4 py-4 text-sm text-slate-400">Every captured day matched the plan.</p>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-[11px] uppercase tracking-wide text-slate-400">
                    <th className="px-4 py-1.5 font-semibold">Truck</th>
                    <th className="px-3 py-1.5 font-semibold">Depot</th>
                    <th className="px-3 py-1.5 font-semibold">Days off-plan</th>
                    <th className="px-3 py-1.5 font-semibold">Of days</th>
                    <th className="px-3 py-1.5 font-semibold">Share</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {churnTop.map((c) => (
                    <tr key={c.truck}>
                      <td className="px-4 py-1.5 font-mono font-semibold text-slate-700">{c.truck}</td>
                      <td className="px-3 py-1.5 text-slate-500">{truckMeta.get(c.truck)?.depot.name ?? "—"}</td>
                      <td className="px-3 py-1.5 tabular-nums font-semibold text-amber-700">{c.changed}</td>
                      <td className="px-3 py-1.5 tabular-nums text-slate-500">{c.days}</td>
                      <td className="px-3 py-1.5 tabular-nums text-slate-600">{Math.round(c.pct * 100)}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            <p className="border-t border-slate-100 px-4 py-2 text-[11px] text-slate-400">
              A truck that constantly runs off-plan usually means its default driver is wrong — fix it on the Trucks
              screen and the roll-forward gets more accurate for everyone.
            </p>
          </section>
        </>
      )}
    </div>
  );
}
