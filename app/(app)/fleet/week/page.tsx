import Link from "next/link";
import { fleetBoardRepo, driverLeaveRepo, referenceRepo } from "@/lib/db/repositories";
import { loadFleetCatalog } from "@/lib/fleet/catalog";
import { availFor } from "@/lib/wfm/fleet";
import { addDaysUTC, fmtDayShort, fmtRange, mondayOf, parseYmdOrNull, todayUTC, ymd } from "@/lib/wfm/date";
import { PageHeader } from "@/components/PageHeader";

export const dynamic = "force-dynamic";

/**
 * The week ahead — cover planning at a glance. One row per depot, one column
 * per day (Mon–Sun): trucks on road / total, who's short, and how many
 * drivers are on approved leave. Uncaptured days roll forward exactly like
 * the day board, so Thursday's hole shows up on Monday.
 */
export default async function FleetWeekPage({ searchParams }: { searchParams: Promise<{ w?: string }> }) {
  const { w } = await searchParams;
  const monday = mondayOf(parseYmdOrNull(w ?? null) ?? todayUTC());
  const days = Array.from({ length: 7 }, (_, i) => addDaysUTC(monday, i));
  const todayKey = ymd(todayUTC());

  const [catalog, holidays, ...perDay] = await Promise.all([
    loadFleetCatalog(),
    referenceRepo.listHolidays(ymd(days[0]), ymd(days[6])),
    ...days.map(async (d) => ({
      rows: await fleetBoardRepo.getBoard(d),
      leave: await driverLeaveRepo.listApprovedOn(d),
      captured: await fleetBoardRepo.isMaterialised(d),
    })),
  ]);

  const truckDepot = new Map(catalog.trucks.map((t) => [t.id, t.depot]));
  const driverDepot = new Map(catalog.drivers.map((d) => [d.id, d.depot]));
  const holidayByDay = new Map(holidays.map((h) => [h.date, h]));
  // Depots that actually field trucks, in catalog (region, name) order.
  const depots = catalog.depots.filter((dep) => catalog.trucks.some((t) => t.depot === dep.name));

  const fleetDay = perDay.map((d) => availFor(d.rows));

  const cell = (depotName: string, dayIdx: number) => {
    const rows = perDay[dayIdx].rows.filter((r) => truckDepot.get(r.truck) === depotName);
    const leave = perDay[dayIdx].leave.filter((l) => driverDepot.get(l.driverId) === depotName).length;
    return { a: availFor(rows), leave };
  };

  const pctCls = (pct: number) => (pct >= 0.9 ? "text-brand-deep" : pct >= 0.8 ? "text-amber-600" : "text-rose-600");

  const weekKey = ymd(monday);
  const nav = (delta: number) => `/fleet/week?w=${ymd(addDaysUTC(monday, delta))}`;

  return (
    <div className="space-y-4">
      <PageHeader
        title="Week ahead"
        description="Cover per depot for the coming days — saved days show what happened, unsaved days roll forward from default drivers minus approved leave. Click any day to open its board."
      />

      <div className="flex items-center gap-1.5">
        <Link href={nav(-7)} className="rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-sm text-slate-500 hover:bg-slate-50" aria-label="Previous week">
          ‹
        </Link>
        <span className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm font-semibold text-brand-deep">
          {fmtRange(days[0], days[6])}
        </span>
        <Link href={nav(7)} className="rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-sm text-slate-500 hover:bg-slate-50" aria-label="Next week">
          ›
        </Link>
        <Link href="/fleet/week" className="ml-1 rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50">
          This week
        </Link>
      </div>

      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-card">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-left align-bottom">
              <th className="px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-slate-400">Depot</th>
              {days.map((d, i) => {
                const key = ymd(d);
                const holiday = holidayByDay.get(key);
                const weekend = d.getUTCDay() === 0 || d.getUTCDay() === 6;
                return (
                  <th key={key} className={`px-3 py-2 ${weekend ? "bg-slate-50/70" : ""}`}>
                    <Link href={`/fleet?d=${key}`} className="group block">
                      <span className={`block text-[11px] font-semibold uppercase tracking-wide ${key === todayKey ? "text-brand-mid" : "text-slate-400"} group-hover:text-brand-deep`}>
                        {fmtDayShort(d)}
                        {key === todayKey && " · today"}
                      </span>
                      <span className={`block text-[13px] font-bold tabular-nums ${pctCls(fleetDay[i].pct)}`}>
                        {Math.round(fleetDay[i].pct * 100)}%
                      </span>
                    </Link>
                    {holiday && (
                      <span className="mt-0.5 block truncate text-[10px] font-medium text-violet-600" title={`${holiday.name} (${holiday.states})`}>
                        ★ {holiday.name}
                      </span>
                    )}
                    {!perDay[i].captured && <span className="block text-[9px] font-medium uppercase text-slate-300">roll-fwd</span>}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {depots.map((dep) => (
              <tr key={dep.name}>
                <td className="whitespace-nowrap px-3 py-1.5">
                  <span className="font-medium text-slate-700">{dep.name}</span>
                  <span className="ml-1.5 text-[10px] uppercase tracking-wide text-slate-400">{dep.region}</span>
                </td>
                {days.map((d, i) => {
                  const key = ymd(d);
                  const { a, leave } = cell(dep.name, i);
                  const weekend = d.getUTCDay() === 0 || d.getUTCDay() === 6;
                  if (a.total === 0)
                    return (
                      <td key={key} className={`px-3 py-1.5 text-xs text-slate-300 ${weekend ? "bg-slate-50/70" : ""}`}>
                        —
                      </td>
                    );
                  return (
                    <td key={key} className={`px-3 py-1.5 ${weekend ? "bg-slate-50/70" : ""}`}>
                      <Link href={`/fleet?d=${key}`} className="group inline-flex items-baseline gap-1.5">
                        <span className={`text-[13px] font-semibold tabular-nums ${pctCls(a.pct)} group-hover:underline`}>
                          {a.on}/{a.total}
                        </span>
                        {a.needsCover > 0 && (
                          <span className="rounded-full bg-rose-100 px-1.5 py-0.5 text-[10px] font-bold text-rose-700">
                            {a.needsCover} short
                          </span>
                        )}
                        {leave > 0 && <span className="text-[10px] text-slate-400">{leave} lv</span>}
                      </Link>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="text-xs text-slate-400">
        <span className="font-semibold text-rose-600">N short</span> = trucks needing a driver ·{" "}
        <span className="font-semibold">N lv</span> = drivers on approved leave · ★ public holiday ·{" "}
        <span className="uppercase">roll-fwd</span> = not yet saved, projected from default drivers. Week of {weekKey}.
      </p>
    </div>
  );
}
