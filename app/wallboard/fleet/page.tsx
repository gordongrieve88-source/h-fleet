import Link from "next/link";
import { fleetBoardRepo, driverLeaveRepo, referenceRepo, fleetRepo } from "@/lib/db/repositories";
import { todayUTC, ymd } from "@/lib/wfm/date";
import { availFor, isOnRoad } from "@/lib/wfm/fleet";
import { WallboardLive } from "./WallboardLive";

/**
 * Fleet dashboard — the office TV view. Region-level numbers, not truck
 * lists: how much of the fleet is on the road, where cover is needed, what's
 * broken down, who's on leave. Re-fetches every minute via WallboardLive.
 */
export const dynamic = "force-dynamic";

const needsDriver = (r: { status: string; driverId: number | null }) =>
  r.driverId == null && (isOnRoad(r.status) || r.status.toUpperCase() === "OFF-ND");

export default async function FleetWallboardPage() {
  const today = todayUTC();
  const todayKey = ymd(today);

  const [rows, trucks, drivers, onLeave, leaveTypes, todaysHolidays] = await Promise.all([
    fleetBoardRepo.getBoard(today),
    fleetRepo.listTrucks(),
    fleetRepo.listDrivers(),
    driverLeaveRepo.listApprovedOn(today),
    referenceRepo.listLeaveTypes(),
    referenceRepo.listHolidays(todayKey, todayKey),
  ]);

  const driverById = new Map(drivers.map((d) => [d.id, d]));
  const truckById = new Map(trucks.map((t) => [t.id, t]));
  const typeByCode = new Map(leaveTypes.map((t) => [t.code, t]));
  const fleet = availFor(rows);
  const fleetBreakdowns = rows.filter((r) => r.status.toUpperCase() === "OFF-BD").length;

  // Regions in catalog order, with their board rows.
  const regions: string[] = [];
  for (const t of trucks) if (!regions.includes(t.region)) regions.push(t.region);
  const rowsByRegion = new Map<string, typeof rows>();
  for (const r of rows) {
    const region = truckById.get(r.truck)?.region;
    if (!region) continue;
    const list = rowsByRegion.get(region) ?? [];
    list.push(r);
    rowsByRegion.set(region, list);
  }

  // Drivers on leave, grouped per region via their home depot.
  const leaveRegionByDriver = new Map<number, string>();
  for (const l of onLeave) {
    const d = driverById.get(l.driverId);
    if (d) leaveRegionByDriver.set(l.driverId, d.depot.regionName);
  }
  const onLeaveByRegion = new Map<string, number>();
  for (const region of leaveRegionByDriver.values()) {
    onLeaveByRegion.set(region, (onLeaveByRegion.get(region) ?? 0) + 1);
  }

  // Trucks that need a driver right now — the actionable list.
  const coverList = rows
    .filter(needsDriver)
    .map((r) => {
      const t = truckById.get(r.truck);
      return { truck: r.truck, block: t?.block ?? "—", region: t?.region ?? "—" };
    })
    .sort((a, b) => a.region.localeCompare(b.region) || a.truck.localeCompare(b.truck));

  const leaveList = onLeave
    .map((l) => ({
      name: driverById.get(l.driverId)?.name ?? `#${l.driverId}`,
      depot: driverById.get(l.driverId)?.depot.name ?? "",
      code: l.leaveTypeCode,
      color: typeByCode.get(l.leaveTypeCode)?.colorHex ?? "#94a3b8",
    }))
    .sort((a, b) => a.name.localeCompare(b.name));

  const dateLabel = today.toLocaleDateString("en-AU", { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
  const pctCls = (pct: number) => (pct < 0.8 ? "text-rose-400" : pct < 0.9 ? "text-amber-300" : "text-brand-bright");

  return (
    <div className="flex min-h-screen flex-col bg-brand-deep px-6 py-5 text-white sm:px-10 sm:py-7">
      <header className="flex flex-wrap items-center justify-between gap-6">
        <div className="flex items-center gap-3">
          <img src="/logo.png" alt="" className="h-10 w-10" />
          <div className="leading-tight">
            <div className="font-heading text-2xl font-semibold">
              H-<span className="text-brand-bright">Fleet</span> · today
            </div>
            <div className="text-sm text-white/60">{dateLabel}</div>
          </div>
        </div>
        <WallboardLive refreshSeconds={60} />
      </header>

      {todaysHolidays.length > 0 && (
        <div className="mt-5 rounded-xl bg-amber-400/95 px-4 py-2.5 text-base font-semibold text-amber-950">
          🎉 Public holiday today: {todaysHolidays.map((h) => `${h.name} (${h.states === "ALL" ? "all states" : h.states})`).join(" · ")}
        </div>
      )}

      {/* Fleet-wide numbers */}
      <section className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-5">
        {[
          { label: "of the fleet available", value: `${Math.round(fleet.pct * 100)}%`, cls: pctCls(fleet.pct) },
          { label: "trucks on the road", value: `${fleet.on}`, sub: `of ${fleet.total}`, cls: "text-white" },
          { label: "need a driver", value: `${fleet.needsCover}`, cls: fleet.needsCover > 0 ? "text-rose-400" : "text-white/40" },
          { label: "broken down", value: `${fleetBreakdowns}`, cls: fleetBreakdowns > 0 ? "text-amber-300" : "text-white/40" },
          { label: "drivers on leave", value: `${onLeave.length}`, cls: "text-white" },
        ].map((k) => (
          <div key={k.label} className="rounded-2xl bg-white/[0.06] px-4 py-4 ring-1 ring-white/10">
            <div className={`font-heading text-5xl font-semibold tabular-nums ${k.cls}`}>
              {k.value}
              {k.sub && <span className="ml-1.5 text-lg font-normal text-white/40">{k.sub}</span>}
            </div>
            <div className="mt-1 text-sm text-white/55">{k.label}</div>
          </div>
        ))}
      </section>

      {/* Per-region cards */}
      <main className="mt-5 flex-1 space-y-5">
        <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {regions.map((region) => {
            const rRows = rowsByRegion.get(region) ?? [];
            if (rRows.length === 0) return null;
            const ra = availFor(rRows);
            const rBreakdowns = rRows.filter((r) => r.status.toUpperCase() === "OFF-BD").length;
            const rLeave = onLeaveByRegion.get(region) ?? 0;

            // On/total per vehicle type within the region.
            const byType = new Map<string, { on: number; total: number }>();
            for (const r of rRows) {
              const type = truckById.get(r.truck)?.type ?? "Agitator";
              const agg = byType.get(type) ?? { on: 0, total: 0 };
              agg.total++;
              if (isOnRoad(r.status)) agg.on++;
              byType.set(type, agg);
            }

            return (
              <section key={region} className="rounded-2xl bg-white/[0.06] p-4 ring-1 ring-white/10">
                <div className="flex items-baseline justify-between">
                  <h2 className="font-heading text-lg font-semibold">{region}</h2>
                  <span className={`font-heading text-3xl font-semibold tabular-nums ${pctCls(ra.pct)}`}>{Math.round(ra.pct * 100)}%</span>
                </div>

                <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-white/10">
                  <div
                    className={`h-full rounded-full ${ra.pct < 0.8 ? "bg-rose-400" : ra.pct < 0.9 ? "bg-amber-300" : "bg-brand-bright"}`}
                    style={{ width: `${Math.round(ra.pct * 100)}%` }}
                  />
                </div>
                <div className="mt-2 text-sm text-white/65">
                  <strong className="tabular-nums text-white">{ra.on}</strong> of {ra.total} trucks on the road
                </div>

                <div className="mt-3 flex flex-wrap gap-1.5 text-xs">
                  {ra.needsCover > 0 && (
                    <span className="rounded-full bg-rose-500/90 px-2.5 py-1 font-semibold">{ra.needsCover} need a driver</span>
                  )}
                  {rBreakdowns > 0 && (
                    <span className="rounded-full bg-amber-400/90 px-2.5 py-1 font-semibold text-amber-950">{rBreakdowns} broken down</span>
                  )}
                  {rLeave > 0 && <span className="rounded-full bg-white/10 px-2.5 py-1">{rLeave} on leave</span>}
                  {ra.needsCover === 0 && rBreakdowns === 0 && (
                    <span className="rounded-full bg-brand-bright/15 px-2.5 py-1 font-semibold text-brand-bright">all covered</span>
                  )}
                </div>

                <ul className="mt-3 space-y-1 border-t border-white/10 pt-2.5 text-sm text-white/65">
                  {[...byType.entries()]
                    .sort((a, b) => b[1].total - a[1].total)
                    .map(([type, agg]) => (
                      <li key={type} className="flex items-baseline justify-between">
                        <span>{type}s</span>
                        <span className="tabular-nums">
                          <strong className="text-white">{agg.on}</strong>
                          <span className="text-white/40"> / {agg.total} on road</span>
                        </span>
                      </li>
                    ))}
                </ul>
              </section>
            );
          })}
        </section>

        <div className="grid gap-3 lg:grid-cols-2">
          {/* Needs cover — the actionable list */}
          <section className="rounded-2xl bg-white/[0.06] p-4 ring-1 ring-white/10">
            <h2 className="font-heading text-base font-semibold">
              Needs a driver{coverList.length > 0 && <span className="ml-2 rounded-full bg-rose-500/90 px-2.5 py-0.5 text-xs font-bold align-middle">{coverList.length}</span>}
            </h2>
            {coverList.length === 0 ? (
              <p className="mt-2 text-sm text-white/45">Every truck on the road has a driver.</p>
            ) : (
              <ul className="mt-2 grid gap-x-6 gap-y-1 sm:grid-cols-2">
                {coverList.map((c) => (
                  <li key={c.truck} className="flex items-center gap-2 text-sm">
                    <span className="w-[76px] shrink-0 rounded bg-rose-500/20 px-1.5 py-0.5 text-center font-mono text-xs font-bold text-rose-300">
                      {c.truck}
                    </span>
                    <span className="truncate text-white/75">{c.block}</span>
                    <span className="ml-auto shrink-0 text-xs text-white/40">{c.region}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {/* On leave today */}
          <section className="rounded-2xl bg-white/[0.06] p-4 ring-1 ring-white/10">
            <h2 className="font-heading text-base font-semibold">On leave today · {leaveList.length}</h2>
            {leaveList.length === 0 ? (
              <p className="mt-2 text-sm text-white/45">Nobody on leave.</p>
            ) : (
              <ul className="mt-2 grid gap-x-6 gap-y-1 sm:grid-cols-2">
                {leaveList.map((l, i) => (
                  <li key={i} className="flex items-center gap-2 text-sm text-white/70">
                    <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: l.color }} />
                    <span className="truncate">{l.name}</span>
                    <span className="ml-auto shrink-0 text-xs text-white/40">
                      {l.depot} · {l.code}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </main>

      <footer className="mt-5 flex items-center justify-between text-xs text-white/35">
        <span>H-Fleet · live dashboard · refreshes every minute</span>
        <Link href="/fleet" className="rounded px-2 py-1 hover:bg-white/10 hover:text-white/70">
          Exit dashboard →
        </Link>
      </footer>
    </div>
  );
}
