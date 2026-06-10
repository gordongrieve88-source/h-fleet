import Link from "next/link";
import { fleetBoardRepo, driverLeaveRepo, referenceRepo, fleetRepo } from "@/lib/db/repositories";
import { todayUTC, ymd } from "@/lib/wfm/date";
import { availFor, isOnRoad, statusKind, statusLabel } from "@/lib/wfm/fleet";
import { WallboardLive } from "./WallboardLive";

/**
 * Fleet wallboard — the dispatch-office TV view of today's truck board.
 * Dark theme, zero controls: every truck per block, needs-cover in red,
 * breakdowns flagged, who's on leave, a PH banner.
 * Re-fetches every minute via the WallboardLive island.
 */
export const dynamic = "force-dynamic";

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

  // region → block → rows, in catalog order.
  const regions: string[] = [];
  const blocksByRegion = new Map<string, string[]>();
  for (const t of trucks) {
    if (!regions.includes(t.region)) regions.push(t.region);
    const blocks = blocksByRegion.get(t.region) ?? [];
    if (!blocks.includes(t.block)) blocks.push(t.block);
    blocksByRegion.set(t.region, blocks);
  }
  const rowsByBlock = new Map<string, typeof rows>();
  for (const r of rows) {
    const block = truckById.get(r.truck)?.block;
    if (!block) continue;
    const list = rowsByBlock.get(block) ?? [];
    list.push(r);
    rowsByBlock.set(block, list);
  }

  const leaveList = onLeave
    .map((l) => ({
      name: driverById.get(l.driverId)?.name ?? `#${l.driverId}`,
      code: l.leaveTypeCode,
      color: typeByCode.get(l.leaveTypeCode)?.colorHex ?? "#94a3b8",
    }))
    .sort((a, b) => a.name.localeCompare(b.name));

  const dateLabel = today.toLocaleDateString("en-AU", { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });

  return (
    <div className="flex min-h-screen flex-col bg-brand-deep px-6 py-5 text-white sm:px-10 sm:py-7">
      <header className="flex flex-wrap items-start justify-between gap-6">
        <div>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-bright font-heading text-lg font-bold text-brand-deep">F</div>
            <div className="leading-tight">
              <div className="font-heading text-2xl font-semibold">Today&apos;s fleet</div>
              <div className="text-sm text-white/60">{dateLabel}</div>
            </div>
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-2 text-sm">
            <span className={`rounded-full px-3 py-1 ${fleet.pct < 0.8 ? "bg-rose-500/90 font-semibold" : "bg-white/10"}`}>
              <strong className="tabular-nums">{Math.round(fleet.pct * 100)}%</strong> available
            </span>
            <span className="rounded-full bg-white/10 px-3 py-1">
              <strong className="tabular-nums">{fleet.on}</strong> on road
            </span>
            <span className={`rounded-full px-3 py-1 ${fleet.needsCover > 0 ? "bg-rose-500/90 font-semibold" : "bg-white/10"}`}>
              <strong className="tabular-nums">{fleet.needsCover}</strong> need cover
            </span>
            <span className="rounded-full bg-white/10 px-3 py-1">
              <strong className="tabular-nums">{onLeave.length}</strong> on leave
            </span>
          </div>
        </div>
        <WallboardLive refreshSeconds={60} />
      </header>

      {todaysHolidays.length > 0 && (
        <div className="mt-5 rounded-xl bg-amber-400/95 px-4 py-2.5 text-base font-semibold text-amber-950">
          🎉 Public holiday today: {todaysHolidays.map((h) => `${h.name} (${h.states === "ALL" ? "all states" : h.states})`).join(" · ")}
        </div>
      )}

      <main className="mt-6 flex-1 space-y-6">
        {regions.map((region) => (
          <section key={region}>
            <h2 className="mb-2 font-heading text-sm font-bold uppercase tracking-[0.14em] text-white/50">{region}</h2>
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              {(blocksByRegion.get(region) ?? []).map((block) => {
                const bRows = rowsByBlock.get(block) ?? [];
                if (bRows.length === 0) return null;
                const ba = availFor(bRows);
                return (
                  <section key={block} className="rounded-2xl bg-white/[0.06] p-3.5 ring-1 ring-white/10">
                    <div className="flex items-center justify-between border-b border-white/10 pb-2">
                      <h3 className="font-heading text-base font-semibold">{block}</h3>
                      {ba.needsCover > 0 ? (
                        <span className="rounded-full bg-rose-500/90 px-2.5 py-0.5 text-xs font-bold">{ba.needsCover} need cover</span>
                      ) : (
                        <span className="rounded-full bg-brand-bright/20 px-2.5 py-0.5 text-xs font-semibold text-brand-bright">
                          {ba.on}/{ba.total} on road
                        </span>
                      )}
                    </div>
                    <ul className="mt-2 space-y-1">
                      {bRows.map((r) => {
                        const driver = r.driverId != null ? driverById.get(r.driverId) : null;
                        const kind = statusKind(r.status);
                        const needsCover = !driver && (isOnRoad(r.status) || r.status.toUpperCase() === "OFF-ND");
                        return (
                          <li key={r.truck} className={`flex items-center gap-2 rounded-lg px-2 py-1 ${needsCover ? "bg-rose-500/15" : ""}`}>
                            <span className="w-[72px] shrink-0 rounded bg-white/10 px-1.5 py-0.5 text-center font-mono text-xs font-bold tracking-wide">
                              {r.truck}
                            </span>
                            {driver ? (
                              <span className="flex-1 truncate text-sm font-semibold">{driver.name}</span>
                            ) : needsCover ? (
                              <span className="flex-1 text-sm font-semibold italic text-rose-300">Needs cover</span>
                            ) : (
                              <span className="flex-1 text-sm text-white/30">—</span>
                            )}
                            <span
                              title={statusLabel(r.status)}
                              className={`shrink-0 rounded px-1.5 py-0.5 text-[10px] font-bold ${
                                kind === "on" ? "bg-brand-bright/20 text-brand-bright" : kind === "warn" ? "bg-amber-400/90 text-amber-950" : "bg-rose-500/90 text-white"
                              }`}
                            >
                              {r.status}
                            </span>
                          </li>
                        );
                      })}
                    </ul>
                  </section>
                );
              })}
            </div>
          </section>
        ))}

        {leaveList.length > 0 && (
          <section className="rounded-2xl bg-white/[0.06] p-4 ring-1 ring-white/10">
            <h2 className="font-heading text-base font-semibold">On leave today · {leaveList.length}</h2>
            <ul className="mt-2 grid gap-x-6 gap-y-1 sm:grid-cols-2 lg:grid-cols-4">
              {leaveList.map((l, i) => (
                <li key={i} className="flex items-center gap-2 text-sm text-white/70">
                  <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: l.color }} />
                  <span className="truncate">{l.name}</span>
                  <span className="text-xs text-white/40">{l.code}</span>
                </li>
              ))}
            </ul>
          </section>
        )}
      </main>

      <footer className="mt-5 flex items-center justify-between text-xs text-white/35">
        <span>H-Fleet · live board · refreshes every minute</span>
        <Link href="/fleet" className="rounded px-2 py-1 hover:bg-white/10 hover:text-white/70">
          Exit wallboard →
        </Link>
      </footer>
    </div>
  );
}
